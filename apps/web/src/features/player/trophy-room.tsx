import { TrophyRoomView } from './trophy-room-view';
import { usePlayer } from './use-player';

export function TrophyRoomPage() {
  return <TrophyRoomView achievements={usePlayer().achievements} />;
}
