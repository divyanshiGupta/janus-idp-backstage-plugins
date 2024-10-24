import { DiscoveryApi, IdentityApi } from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';
import type { JsonObject } from '@backstage/types';

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  RawAxiosRequestHeaders,
} from 'axios';

import {
  AssessedProcessInstanceDTO,
  Configuration,
  DefaultApi,
  ExecuteWorkflowResponseDTO,
  Filter,
  GetInstancesRequest,
  InputSchemaResponseDTO,
  PaginationInfoDTO,
  ProcessInstanceListResultDTO,
  WorkflowDefinition,
  WorkflowExecutionResponse,
  WorkflowOverviewDTO,
  WorkflowOverviewListResultDTO,
} from '@janus-idp/backstage-plugin-orchestrator-common';

import { OrchestratorApi } from './api';

export interface OrchestratorClientOptions {
  discoveryApi: DiscoveryApi;
  identityApi: IdentityApi;
  axiosInstance?: AxiosInstance;
}
export class OrchestratorClient implements OrchestratorApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly identityApi: IdentityApi;
  private axiosInstance?: AxiosInstance;

  private baseUrl: string | null = null;
  constructor(options: OrchestratorClientOptions) {
    this.discoveryApi = options.discoveryApi;
    this.identityApi = options.identityApi;
    this.axiosInstance = options.axiosInstance;
  }

  async getDefaultAPI(): Promise<DefaultApi> {
    const baseUrl = await this.getBaseUrl();
    const { token: idToken } = await this.identityApi.getCredentials();

    // Fixme: Following makes mocking of global axios complicated in the tests, ideally there should be just one axios instance:
    this.axiosInstance =
      this.axiosInstance ||
      axios.create({
        baseURL: baseUrl,
        headers: {
          ...(idToken && { Authorization: `Bearer ${idToken}` }),
        },
        withCredentials: true,
      });
    const config = new Configuration({
      basePath: baseUrl,
    });

    return new DefaultApi(config, baseUrl, this.axiosInstance);
  }
  private async getBaseUrl(): Promise<string> {
    if (!this.baseUrl) {
      this.baseUrl = await this.discoveryApi.getBaseUrl('orchestrator');
    }

    return this.baseUrl;
  }

  async executeWorkflow(args: {
    workflowId: string;
    parameters: JsonObject;
    businessKey?: string;
  }): Promise<AxiosResponse<ExecuteWorkflowResponseDTO>> {
    const defaultApi = await this.getDefaultAPI();
    const reqConfigOption: AxiosRequestConfig =
      await this.getDefaultReqConfig();
    return await defaultApi.executeWorkflow(
      args.workflowId,
      { inputData: args.parameters },
      reqConfigOption,
    );
  }

  async abortWorkflowInstance(
    instanceId: string,
  ): Promise<AxiosResponse<string>> {
    const defaultApi = await this.getDefaultAPI();
    const reqConfigOption: AxiosRequestConfig =
      await this.getDefaultReqConfig();
    return await defaultApi.abortWorkflow(instanceId, reqConfigOption);
  }

  async getWorkflowDefinition(workflowId: string): Promise<WorkflowDefinition> {
    const baseUrl = await this.getBaseUrl();
    return await this.fetcher(`${baseUrl}/workflows/${workflowId}`).then(r =>
      r.json(),
    );
  }

  async getWorkflowSource(workflowId: string): Promise<AxiosResponse<string>> {
    const defaultApi = await this.getDefaultAPI();
    const reqConfigOption: AxiosRequestConfig =
      await this.getDefaultReqConfig();
    reqConfigOption.responseType = 'text';
    return await defaultApi.getWorkflowSourceById(workflowId, reqConfigOption);
  }

  async listWorkflowOverviews(
    paginationInfo?: PaginationInfoDTO,
    filters?: Filter,
  ): Promise<AxiosResponse<WorkflowOverviewListResultDTO>> {
    const defaultApi = await this.getDefaultAPI();
    const reqConfigOption: AxiosRequestConfig =
      await this.getDefaultReqConfig();
    return await defaultApi.getWorkflowsOverview(
      { paginationInfo, filters },
      reqConfigOption,
    );
  }

  async listInstances(
    args: GetInstancesRequest,
  ): Promise<AxiosResponse<ProcessInstanceListResultDTO>> {
    const defaultApi = await this.getDefaultAPI();
    const reqConfigOption: AxiosRequestConfig =
      await this.getDefaultReqConfig();
    return await defaultApi.getInstances(args, reqConfigOption);
  }

  async getInstance(
    instanceId: string,
    includeAssessment = false,
  ): Promise<AxiosResponse<AssessedProcessInstanceDTO>> {
    const defaultApi = await this.getDefaultAPI();
    const reqConfigOption: AxiosRequestConfig =
      await this.getDefaultReqConfig();
    try {
      return await defaultApi.getInstanceById(
        instanceId,
        includeAssessment,
        reqConfigOption,
      );
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async getWorkflowDataInputSchema(
    workflowId: string,
    instanceId?: string,
  ): Promise<AxiosResponse<InputSchemaResponseDTO>> {
    const defaultApi = await this.getDefaultAPI();
    const reqConfigOption: AxiosRequestConfig =
      await this.getDefaultReqConfig();
    return await defaultApi.getWorkflowInputSchemaById(
      workflowId,
      instanceId,
      reqConfigOption,
    );
  }

  async getWorkflowOverview(
    workflowId: string,
  ): Promise<AxiosResponse<WorkflowOverviewDTO>> {
    const defaultApi = await this.getDefaultAPI();
    const reqConfigOption: AxiosRequestConfig =
      await this.getDefaultReqConfig();
    return await defaultApi.getWorkflowOverviewById(
      workflowId,
      reqConfigOption,
    );
  }

  async retriggerInstanceInError(args: {
    instanceId: string;
    inputData: JsonObject;
  }): Promise<WorkflowExecutionResponse> {
    const baseUrl = await this.getBaseUrl();
    const urlToFetch = `${baseUrl}/instances/${args.instanceId}/retrigger`;
    return await this.fetcher(urlToFetch, {
      method: 'POST',
      body: JSON.stringify(args.inputData),
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json());
  }

  /** fetcher is convenience fetch wrapper that includes authentication
   * and other necessary headers **/
  private async fetcher(
    url: string,
    requestInit?: RequestInit,
  ): Promise<Response> {
    const { token: idToken } = await this.identityApi.getCredentials();
    const r = { ...requestInit };
    r.headers = {
      ...r.headers,
      ...(idToken && { Authorization: `Bearer ${idToken}` }),
    };
    const response = await fetch(url, r);
    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }
    return response;
  }

  // getDefaultReqConfig is a convenience wrapper that includes authentication and other necessary headers
  private async getDefaultReqConfig(
    additionalHeaders?: RawAxiosRequestHeaders,
  ): Promise<AxiosRequestConfig> {
    const idToken = await this.identityApi.getCredentials();
    const reqConfigOption: AxiosRequestConfig = {
      baseURL: await this.getBaseUrl(),
      headers: {
        Authorization: `Bearer ${idToken.token}`,
        ...additionalHeaders,
      },
    };
    return reqConfigOption;
  }
}
