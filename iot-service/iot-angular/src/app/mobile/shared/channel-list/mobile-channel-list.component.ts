import { Component, Input } from '@angular/core';
import { SPARK_H, SPARK_W } from '@app/shared/utils/channel-display';
import { ChannelRow } from '../channel-rows';

/**
 * Daftar channel (presentasional): judul alamat-dulu, nilai id-ID sesuai presisi, status
 * freshness × ambang, teks ambang, sparkline 24 jam dari /sensors/trends (tanpa request per baris).
 * Ketuk baris → grafik channel (`/mobile/p/:pid/nodes/:nid/channels/:cid`).
 */
@Component({
  selector: 'mobile-channel-list',
  templateUrl: './mobile-channel-list.component.html',
  standalone: false
})
export class MobileChannelListComponent {
  @Input() rows: ChannelRow[] = [];
  @Input() emptyText = 'Tidak ada channel';
  readonly sparkW = SPARK_W;
  readonly sparkH = SPARK_H;

  trackById(_: number, r: ChannelRow): string { return r.id; }
}
