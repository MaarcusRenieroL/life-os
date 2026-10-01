package com.lifeos.notes.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import com.lifeos.notes.domains.entity.Note;
import com.lifeos.notes.domains.entity.NoteAttachment;
import com.lifeos.notes.exception.NoteValidationException;
import com.lifeos.notes.repository.NoteAttachmentRepository;
import com.lifeos.notes.repository.NoteRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class NoteAttachmentServiceTest {

  @Mock private NoteAttachmentRepository attachmentRepository;
  @Mock private NoteRepository noteRepository;
  @InjectMocks private NoteAttachmentService service;

  @TempDir Path storage;
  private final UUID user = UUID.randomUUID();
  private final UUID note = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    ReflectionTestUtils.setField(service, "storagePath", storage.toString());
    lenient().when(noteRepository.findByIdAndUserIdAndDeletedAtIsNull(note, user)).thenReturn(Optional.of(mock(Note.class)));
    lenient().when(attachmentRepository.countByNoteIdAndDeletedAtIsNull(note)).thenReturn(0L);
    lenient().when(attachmentRepository.saveAndFlush(any(NoteAttachment.class))).thenAnswer(i -> i.getArgument(0));
  }

  @Test
  void aTraversalFileNameIsReducedToItsLastSegmentAndNothingEscapesTheStorageFolder() throws Exception {
    var file = new MockMultipartFile("file", "../../../etc/evil.png", "text/html", "x".getBytes());

    var response = service.upload(user, note, file);

    assertThat(response.getFileName()).isEqualTo("evil.png");
    try (var walk = Files.walk(storage)) {
      assertThat(walk.filter(Files::isRegularFile)).hasSize(1).allSatisfy(p -> assertThat(p.startsWith(storage)).isTrue());
    }
  }

  @Test
  void theContentTypeComesFromTheExtensionNotTheClient() {
    var file = new MockMultipartFile("file", "photo.PNG", "text/html; charset=evil", "x".getBytes());

    var response = service.upload(user, note, file);

    assertThat(response.getFileType()).isEqualTo("image/png");
  }

  @Test
  void anExecutableExtensionIsRefused() {
    var file = new MockMultipartFile("file", "run.exe", "application/octet-stream", "x".getBytes());

    assertThatThrownBy(() -> service.upload(user, note, file)).isInstanceOf(NoteValidationException.class);
  }

  @Test
  void displayNamesAreCleaned() {
    assertThat(NoteAttachmentService.sanitiseFileName("C:\\Users\\me\\report.pdf")).isEqualTo("report.pdf");
    assertThat(NoteAttachmentService.sanitiseFileName("a\nb\r.txt")).isEqualTo("ab.txt");
    assertThat(NoteAttachmentService.sanitiseFileName("..")).isEqualTo("file");
    assertThat(NoteAttachmentService.sanitiseFileName(null)).isEqualTo("file");
    assertThat(NoteAttachmentService.sanitiseFileName("x".repeat(300) + ".pdf")).hasSize(200).endsWith(".pdf");
  }
}
