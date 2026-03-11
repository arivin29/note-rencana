import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Search result interfaces
export interface NodeSearchResult {
  id: string;
  code: string;
  name: string;
  serialNumber: string;
  status: string;
  projectName: string;
  projectId: string;
  matchedField: string;
}

export interface DeviceSearchResult {
  id: string;
  hardwareId: string;
  modelName: string;
  status: string;
  lastSeenAt: Date;
  matchedField: string;
}

export interface AlertSearchResult {
  id: string;
  ruleType: string;
  severity: string;
  status: string;
  nodeName: string;
  nodeId: string;
  triggeredAt: Date;
  matchedField: string;
}

export interface ProjectSearchResult {
  id: string;
  name: string;
  ownerName: string;
  status: string;
  nodeCount: number;
  matchedField: string;
}

export interface OwnerSearchResult {
  id: string;
  ownerCode: string;
  name: string;
  industry: string;
  email: string;
  phone: string;
  matchedField: string;
}

export interface CategoryResults<T> {
  total: number;
  data: T[];
}

export interface SearchResponse {
  query: string;
  total: number;
  results: {
    nodes?: CategoryResults<NodeSearchResult>;
    devices?: CategoryResults<DeviceSearchResult>;
    alerts?: CategoryResults<AlertSearchResult>;
    projects?: CategoryResults<ProjectSearchResult>;
    owners?: CategoryResults<OwnerSearchResult>;
  };
}

export interface SearchParams {
  q: string;
  categories?: string[];
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = `${environment.apiUrl}/api/search`;

  constructor(private http: HttpClient) {}

  /**
   * Global search across nodes, devices, alerts, projects, and owners
   */
  search(params: SearchParams): Observable<SearchResponse> {
    let httpParams = new HttpParams().set('q', params.q);
    
    if (params.categories && params.categories.length > 0) {
      httpParams = httpParams.set('categories', params.categories.join(','));
    }
    
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<SearchResponse>(this.apiUrl, { params: httpParams });
  }
}
