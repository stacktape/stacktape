type ApplicationLoadBalancerMetric =
  | 'ActiveConnectionCount'
  | 'AnomalousHostCount'
  | 'ClientTLSNegotiationErrorCount'
  | 'ConsumedLCUs'
  | 'DesyncMitigationMode_NonCompliant_Request_Count'
  | 'DroppedInvalidHeaderRequestCount'
  | 'MitigatedHostCount'
  | 'ForwardedInvalidHeaderRequestCount'
  | 'GrpcRequestCount'
  | 'HTTP_Fixed_Response_Count'
  | 'HTTP_Redirect_Count'
  | 'HTTP_Redirect_Url_Limit_Exceeded_Count'
  | 'HTTPCode_ELB_3XX_Count'
  | 'HTTPCode_ELB_4XX_Count'
  | 'HTTPCode_ELB_5XX_Count'
  | 'HTTPCode_ELB_500_Count'
  | 'HTTPCode_ELB_502_Count'
  | 'HTTPCode_ELB_503_Count'
  | 'HTTPCode_ELB_504_Count'
  | 'IPv6ProcessedBytes'
  | 'IPv6RequestCount'
  | 'NewConnectionCount'
  | 'NonStickyRequestCount'
  | 'ProcessedBytes'
  | 'RejectedConnectionCount'
  | 'RequestCount'
  | 'RuleEvaluations'
  | 'HealthyHostCount'
  | 'HTTPCode_Target_2XX_Count'
  | 'HTTPCode_Target_3XX_Count'
  | 'HTTPCode_Target_4XX_Count'
  | 'HTTPCode_Target_5XX_Count'
  | 'RequestCountPerTarget'
  | 'TargetConnectionErrorCount'
  | 'TargetResponseTime'
  | 'TargetTLSNegotiationErrorCount'
  | 'UnHealthyHostCount'
  | 'HealthyStateDNS'
  | 'HealthyStateRouting'
  | 'UnhealthyRoutingRequestCount'
  | 'UnhealthyStateDNS'
  | 'UnhealthyStateRouting'
  | 'LambdaInternalError'
  | 'LambdaTargetProcessedBytes'
  | 'LambdaUserError'
  | 'ELBAuthError'
  | 'ELBAuthFailure'
  | 'ELBAuthLatency'
  | 'ELBAuthRefreshTokenSuccess'
  | 'ELBAuthSuccess'
  | 'ELBAuthUserClaimsSizeExceeded';

interface ApplicationLoadBalancerCustomTrigger {
  type: 'application-load-balancer-custom';
  properties: ApplicationLoadBalancerCustomTriggerProps;
}

interface ApplicationLoadBalancerCustomTriggerProps extends TriggerWithCustomStatFunction, TriggerWithCustomComparison {
  /**
   * #### The metric to monitor on the Load Balancer.
   *
   * ---
   *
   * The threshold will be compared against the calculated value of `statistic(METRIC)`, where:
   * - `statistic` is the function applied to the metric values collected during the evaluation period (default: `avg`).
   * - `METRIC` is the chosen metric.
   *
   * **Available Metrics:**
   *
   * - `ActiveConnectionCount`: The total number of concurrent TCP connections active from clients to the load balancer and from the load balancer to targets.
   * - `AnomalousHostCount`: The number of hosts detected with anomalies.
   * - `ClientTLSNegotiationErrorCount`: The number of TLS connections initiated by the client that did not establish a session with the load balancer due to a TLS error.
   * - `ConsumedLCUs`: The number of load balancer capacity units (LCU) used by your load balancer.
   * - `DesyncMitigationMode_NonCompliant_Request_Count`: The number of requests that do not comply with RFC 7230.
   * - `DroppedInvalidHeaderRequestCount`: The number of requests where the load balancer removed HTTP headers with invalid fields before routing the request.
   * - `MitigatedHostCount`: The number of targets under mitigation.
   * - `ForwardedInvalidHeaderRequestCount`: The number of requests routed by the load balancer that had HTTP headers with invalid fields.
   * - `GrpcRequestCount`: The number of gRPC requests processed over IPv4 and IPv6.
   * - `HTTP_Fixed_Response_Count`: The number of successful fixed-response actions.
   * - `HTTP_Redirect_Count`: The number of successful redirect actions.
   * - `HTTP_Redirect_Url_Limit_Exceeded_Count`: The number of redirect actions that failed because the URL in the response location header exceeded 8K.
   * - `HTTPCode_ELB_3XX_Count`: The number of HTTP 3XX redirection codes originating from the load balancer.
   * - `HTTPCode_ELB_4XX_Count`: The number of HTTP 4XX client error codes originating from the load balancer.
   * - `HTTPCode_ELB_5XX_Count`: The number of HTTP 5XX server error codes originating from the load balancer.
   * - `HTTPCode_ELB_500_Count`: The number of HTTP 500 error codes originating from the load balancer.
   * - `HTTPCode_ELB_502_Count`: The number of HTTP 502 error codes originating from the load balancer.
   * - `HTTPCode_ELB_503_Count`: The number of HTTP 503 error codes originating from the load balancer.
   * - `HTTPCode_ELB_504_Count`: The number of HTTP 504 error codes originating from the load balancer.
   * - `IPv6ProcessedBytes`: The total number of bytes processed by the load balancer over IPv6.
   * - `IPv6RequestCount`: The number of IPv6 requests received by the load balancer.
   * - `NewConnectionCount`: The total number of new TCP connections established from clients to the load balancer and from the load balancer to targets.
   * - `NonStickyRequestCount`: The number of requests where the load balancer chose a new target because it could not use an existing sticky session.
   * - `ProcessedBytes`: The total number of bytes processed by the load balancer over IPv4 and IPv6.
   * - `RejectedConnectionCount`: The number of connections rejected because the load balancer reached its maximum number of connections.
   * - `RequestCount`: The number of requests processed over IPv4 and IPv6.
   * - `RuleEvaluations`: The number of rules processed by the load balancer, averaged over an hour.
   * - `HealthyHostCount`: The number of targets that are considered healthy.
   * - `HTTPCode_Target_2XX_Count`: The number of HTTP 2XX response codes generated by the targets.
   * - `HTTPCode_Target_3XX_Count`: The number of HTTP 3XX response codes generated by the targets.
   * - `HTTPCode_Target_4XX_Count`: The number of HTTP 4XX response codes generated by the targets.
   * - `HTTPCode_Target_5XX_Count`: The number of HTTP 5XX response codes generated by the targets.
   * - `RequestCountPerTarget`: The average number of requests per target in a target group.
   * - `TargetConnectionErrorCount`: The number of connections that were not successfully established between the load balancer and a target.
   * - `TargetResponseTime`: The time elapsed (in seconds) from when a request leaves the load balancer until the target starts sending response headers.
   * - `TargetTLSNegotiationErrorCount`: The number of TLS connections initiated by the load balancer that did not establish a session with the target.
   * - `UnHealthyHostCount`: The number of targets that are considered unhealthy.
   * - `HealthyStateDNS`: The number of zones that meet the DNS healthy state requirements.
   * - `HealthyStateRouting`: The number of zones that meet the routing healthy state requirements.
   * - `UnhealthyRoutingRequestCount`: The number of requests routed using the routing failover action (fail open).
   * - `UnhealthyStateDNS`: The number of zones that do not meet the DNS healthy state requirements.
   * - `UnhealthyStateRouting`: The number of zones that do not meet the routing healthy state requirements.
   * - `LambdaInternalError`: The number of requests to a Lambda function that failed due to an issue internal to the load balancer or AWS Lambda.
   * - `LambdaTargetProcessedBytes`: The total number of bytes processed by the load balancer for requests to and responses from a Lambda function.
   * - `LambdaUserError`: The number of requests to a Lambda function that failed due to an issue with the Lambda function itself.
   * - `ELBAuthError`: The number of user authentications that could not be completed due to an internal error.
   * - `ELBAuthFailure`: The number of user authentications that could not be completed because the IdP denied access.
   * - `ELBAuthLatency`: The time elapsed (in milliseconds) to query the IdP for the ID token and user info.
   * - `ELBAuthRefreshTokenSuccess`: The number of times the load balancer successfully refreshed user claims using a refresh token.
   * - `ELBAuthSuccess`: The number of successful authentication actions.
   * - `ELBAuthUserClaimsSizeExceeded`: The number of times a configured IdP returned user claims that exceeded 11K bytes in size.
   */
  metric: ApplicationLoadBalancerMetric;
  /**
   * #### The threshold that triggers the alarm.
   *
   * ---
   *
   * The threshold is compared against the calculated value of `statistic(METRIC)`, where:
   * - `statistic` is the function applied to the metric values collected during the evaluation period (default: `avg`).
   * - `METRIC` is the chosen metric.
   */
  threshold: number;
}
