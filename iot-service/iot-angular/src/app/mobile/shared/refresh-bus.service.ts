import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/** Bus refresh: pull-to-refresh di layout men-trigger; layar aktif yang subscribe me-reload. */
@Injectable({ providedIn: 'root' })
export class RefreshBusService {
  private readonly _refresh = new Subject<void>();
  readonly refresh$: Observable<void> = this._refresh.asObservable();
  trigger(): void { this._refresh.next(); }
}
