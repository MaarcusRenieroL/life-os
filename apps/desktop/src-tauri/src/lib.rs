use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Touch ID (or the Mac password when there is no sensor) for the app lock.
#[cfg(target_os = "macos")]
mod biometric {
    use block2::RcBlock;
    use objc2::runtime::Bool;
    use objc2_foundation::{NSError, NSString};
    use objc2_local_authentication::{LAContext, LAPolicy};
    use std::sync::mpsc;

    pub fn available() -> bool {
        unsafe { LAContext::new().canEvaluatePolicy_error(LAPolicy::DeviceOwnerAuthentication).is_ok() }
    }

    /// Blocks until the user approves or cancels the system prompt.
    pub fn authenticate(reason: &str) -> bool {
        let (tx, rx) = mpsc::channel::<bool>();
        let reply = RcBlock::new(move |ok: Bool, _error: *mut NSError| {
            let _ = tx.send(ok.as_bool());
        });
        unsafe {
            LAContext::new().evaluatePolicy_localizedReason_reply(
                LAPolicy::DeviceOwnerAuthentication,
                &NSString::from_str(reason),
                &reply,
            );
        }
        rx.recv().unwrap_or(false)
    }
}

/// Set once at startup so a notification click (which arrives on a callback) can reach the window.
static APP: std::sync::OnceLock<AppHandle> = std::sync::OnceLock::new();

/// A click on a system notification: bring the window forward and tell the UI which notification it was.
fn open_from_notification(identifier: &str) {
    let Some(app) = APP.get() else { return };
    show_main(app);
    if let Some(id) = identifier.strip_prefix("lifeos-notif:") {
        let _ = app.emit("notification-open", id.to_string());
    }
}

/// System notifications on macOS through Apple's UserNotifications framework. The generic plugin uses an API
/// current macOS no longer shows, so on a Mac this is what actually puts a banner on screen.
#[cfg(target_os = "macos")]
mod alerts {
    use block2::{DynBlock, RcBlock};
    use objc2::rc::Retained;
    use objc2::runtime::{Bool, NSObject, NSObjectProtocol};
    use objc2::{define_class, msg_send, AnyThread};
    use objc2_foundation::{NSError, NSString};
    use objc2_user_notifications::{
        UNAuthorizationOptions, UNMutableNotificationContent, UNNotification, UNNotificationPresentationOptions, UNNotificationRequest,
        UNNotificationResponse, UNNotificationSound, UNUserNotificationCenter, UNUserNotificationCenterDelegate,
    };
    use std::sync::{mpsc, Once};

    define_class!(
        // Without this macOS hides the banner while the app is in front.
        #[unsafe(super(NSObject))]
        #[name = "LifeOSNotificationDelegate"]
        struct Delegate;

        unsafe impl NSObjectProtocol for Delegate {}

        unsafe impl UNUserNotificationCenterDelegate for Delegate {
            #[unsafe(method(userNotificationCenter:willPresentNotification:withCompletionHandler:))]
            fn will_present(&self, _center: &UNUserNotificationCenter, _notification: &UNNotification, handler: &DynBlock<dyn Fn(UNNotificationPresentationOptions)>) {
                handler.call((UNNotificationPresentationOptions::Banner | UNNotificationPresentationOptions::List | UNNotificationPresentationOptions::Sound,));
            }

            #[unsafe(method(userNotificationCenter:didReceiveNotificationResponse:withCompletionHandler:))]
            fn did_receive(&self, _center: &UNUserNotificationCenter, response: &UNNotificationResponse, handler: &DynBlock<dyn Fn()>) {
                let identifier = response.notification().request().identifier().to_string();
                super::open_from_notification(&identifier);
                handler.call(());
            }
        }
    );

    fn center() -> Retained<UNUserNotificationCenter> {
        static SET_DELEGATE: Once = Once::new();
        let center = UNUserNotificationCenter::currentNotificationCenter();
        SET_DELEGATE.call_once(|| {
            let delegate: Retained<Delegate> = unsafe { msg_send![Delegate::alloc(), init] };
            // The centre only keeps a weak reference, so the delegate is leaked on purpose to live as long as the app.
            center.setDelegate(Some(objc2::runtime::ProtocolObject::from_ref(&*delegate)));
            std::mem::forget(delegate);
        });
        center
    }

    /// Asks macOS for permission (it prompts the first time) and reports whether banners are allowed.
    pub fn request_permission() -> bool {
        let (tx, rx) = mpsc::channel::<bool>();
        let reply = RcBlock::new(move |granted: Bool, _error: *mut NSError| {
            let _ = tx.send(granted.as_bool());
        });
        center().requestAuthorizationWithOptions_completionHandler(UNAuthorizationOptions::Alert | UNAuthorizationOptions::Sound, &reply);
        rx.recv().unwrap_or(false)
    }

    pub fn send(title: &str, body: &str, notification_id: Option<&str>) {
        let content = UNMutableNotificationContent::new();
        content.setTitle(&NSString::from_str(title));
        content.setBody(&NSString::from_str(body));
        let sound = UNNotificationSound::defaultSound();
        content.setSound(Some(&sound));
        // The identifier carries which notification this is, so a click can open the right thing.
        let id = NSString::from_str(&match notification_id {
            Some(nid) => format!("lifeos-notif:{nid}"),
            None => format!("lifeos-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0)),
        });
        let request = UNNotificationRequest::requestWithIdentifier_content_trigger(&id, &content, None);
        center().addNotificationRequest_withCompletionHandler(&request, None);
    }
}

#[tauri::command]
async fn notify_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        tauri::async_runtime::spawn_blocking(alerts::request_permission).await.unwrap_or(false)
    }
    #[cfg(not(target_os = "macos"))]
    {
        true
    }
}

/// Shows a system notification. Returns false where the app should fall back to the generic plugin.
#[tauri::command]
fn notify_os(title: String, body: String, id: Option<String>) -> bool {
    #[cfg(target_os = "macos")]
    {
        alerts::send(&title, &body, id.as_deref());
        true
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (title, body, id);
        false
    }
}

#[tauri::command]
fn biometric_available() -> bool {
    #[cfg(target_os = "macos")]
    {
        biometric::available()
    }
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

/// Async so the blocking wait runs off the main thread and the prompt can appear.
#[tauri::command]
async fn biometric_authenticate(reason: String) -> bool {
    #[cfg(target_os = "macos")]
    {
        tauri::async_runtime::spawn_blocking(move || biometric::authenticate(&reason)).await.unwrap_or(false)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = reason;
        false
    }
}

/// Brings the main window to the front, restoring it if it was hidden to the tray or minimised.
fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// Shows the window and tells the UI to open its quick-capture box.
fn open_capture(app: &AppHandle) {
    show_main(app);
    let _ = app.emit("quick-capture", ());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let capture_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![biometric_available, biometric_authenticate, notify_permission, notify_os])
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        // Requests go through Rust, so the app never needs CORS headers from the gateway.
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if *shortcut == capture_shortcut && event.state() == ShortcutState::Pressed {
                        open_capture(app);
                    }
                })
                .build(),
        )
        .setup(move |app| {
            let _ = APP.set(app.handle().clone());
            // Another app may already own the shortcut; the tray menu still offers quick capture.
            let _ = app.global_shortcut().register(capture_shortcut);

            let capture = MenuItem::with_id(app, "capture", "Quick capture", true, None::<&str>)?;
            let open = MenuItem::with_id(app, "open", "Open Life OS", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&capture, &open, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().expect("app icon missing"))
                .tooltip("Life OS")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "capture" => open_capture(app),
                    "open" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        // Closing the window keeps the app in the tray so the shortcut keeps working.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
