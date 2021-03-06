import { inject } from 'aurelia-framework';
import { HttpClient } from 'aurelia-http-client';
import environment from '../../environment';

@inject(HttpClient)
export class DataAPI {
  constructor(client) {
    this.client = client.configure(cfg => cfg
      .withBaseUrl(environment.gatewayRootURL)
    );
  }

  getScoreRequest(sessionId, afterIndex = '0') {
    return this.client
      .createRequest(`/scores/${sessionId}?afterIndex=${afterIndex}`)
      .asGet();
  }
}
