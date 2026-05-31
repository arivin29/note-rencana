import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface ScadaDiagram {
  id: string;
  ownerId: string;
  projectId?: string | null;
  name: string;
  description?: string | null;
  status: string;
  updatedAt: string;
  nodeCount?: number;
  edgeCount?: number;
}

export interface CreateScadaDiagramPayload {
  name: string;
  ownerId: string;
  projectId?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScadaService {
  private readonly API_URL = `${environment.apiUrl}/api/scada/diagrams`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAccessToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  /** Get all SCADA diagrams for a project */
  getDiagramsByProject(projectId: string): Observable<ScadaDiagram[]> {
    return this.http.get<any>(this.API_URL, {
      headers: this.getHeaders(),
      params: { projectId }
    }).pipe(
      map(response => {
        // Handle paginated response { data: [...], meta: {...} }
        const items = Array.isArray(response) ? response : (response?.data || []);
        return items.map((item: any) => ({
          id: item.idScadaDiagram || item.id,
          ownerId: item.idOwner || item.ownerId,
          projectId: item.idProject || item.projectId,
          name: item.name,
          description: item.description,
          status: item.status,
          updatedAt: item.updatedAt,
          nodeCount: item.nodeCount,
          edgeCount: item.edgeCount
        } as ScadaDiagram));
      })
    );
  }

  /** Create a new SCADA diagram */
  createDiagram(payload: CreateScadaDiagramPayload): Observable<ScadaDiagram> {
    return this.http.post<ScadaDiagram>(this.API_URL, payload, {
      headers: this.getHeaders()
    });
  }

  /** Delete a SCADA diagram */
  deleteDiagram(diagramId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${diagramId}`, {
      headers: this.getHeaders()
    });
  }

  /** Get the SCADA app embed URL for a specific diagram */
  getEmbedUrl(projectId: string, diagramId: string, mode: 'view' | 'edit' = 'view'): string {
    return `${environment.scadaUrl}/embed/${projectId}/diagrams/${diagramId}/${mode}`;
  }
}
