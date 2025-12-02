import { globalStateManager } from '@application-services/global-state-manager';
import { configManager } from '@domain-services/config-manager';
import { WebClient } from '@slack/web-api';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { getPrettyPrintedFlatObject } from '@utils/formatting';
import { jsonFetch } from '@utils/http-client';
import { printer } from '@utils/printer';

const getWarnOnFailedNotificationHandler =
  (args: { type: DeploymentNotificationUserIntegration['type']; [arg: string]: any }) => (err) => {
    const { type, ...restArgs } = args;
    printer.warn(
      `Failed to send notification to ${printer.colorize('cyan', type)}. Details:\n${getPrettyPrintedFlatObject(
        restArgs
      )}\n${printer.colorize('red', 'Error')}: ${err}`
    );
  };

type ProgressMessage = {
  text: string;
  details?: Record<string, any>;
  type: 'progress' | 'error' | 'success';
};

export class NotificationManager {
  isInitialized: boolean;
  #deploymentNotifications: DeploymentNotificationDefinition[] = [];

  init = async (deploymentNotifications: DeploymentNotificationDefinition[]) => {
    this.isInitialized = true;
    this.#deploymentNotifications = await configManager.resolveDirectives<DeploymentNotificationDefinition[]>({
      itemToResolve: deploymentNotifications || [],
      resolveRuntime: true,
      useLocalResolve: true
    });
    configManager.invalidatePotentiallyChangedDirectiveResults();
  };

  sendDeploymentNotification = ({ message }: { message: ProgressMessage }) => {
    return Promise.all(
      this.#deploymentNotifications.map((notification) => {
        if (
          (!notification.forStages ||
            notification.forStages.includes(globalStateManager.targetStack.stage) ||
            notification.forStages[0] === '*') &&
          (!notification.forServices ||
            notification.forServices.includes(globalStateManager.targetStack.projectName) ||
            notification.forServices[0] === '*')
        ) {
          const errHandler = getWarnOnFailedNotificationHandler({
            type: notification.integration.type,
            ...notification.integration.properties
          });
          switch (notification.integration.type) {
            case 'slack': {
              return this.#sendSlackNotification({ ...notification.integration.properties, message }).catch(errHandler);
            }
            case 'ms-teams': {
              return this.#sendMsTeamsNotification({ ...notification.integration.properties, message }).catch(
                errHandler
              );
            }
            case 'email': {
              // @todo
            }
          }
        }
        return null;
      })
    );
  };

  reportError = async (errorStack: string) => {
    let text = `Error performing operation ${globalStateManager.command}`;
    if (globalStateManager.targetStack?.stackName) {
      text += ` on stack ${globalStateManager.targetStack.stackName}.\n`;
    } else {
      text += '.\n';
    }
    text += ` ${errorStack}`;
    await this.sendDeploymentNotification({
      message: { text, type: 'error' }
    });
  };

  #sendSlackNotification = async ({
    conversationId,
    accessToken,
    message
  }: {
    accessToken: string;
    conversationId: string;
    message: ProgressMessage;
  }) => {
    // @todo-matus what happens if access token is passed as $Secret directive - we should handle this similarly to script hooks
    // i.e resolve the directives locally
    const slackClient = new WebClient(accessToken);
    const match = message.text.match(/\[(.*)\]/);
    let prettifiedForSlack = message.text;
    if (match?.[1]) {
      prettifiedForSlack = prettifiedForSlack.replace(match[1], `*${match[1]}*`);
    }

    if (message.type === 'error') {
      prettifiedForSlack = `:x: ${prettifiedForSlack}`;
    } else if (message.type === 'success') {
      prettifiedForSlack = `:white_check_mark: ${prettifiedForSlack}`;
    } else if (message.type === 'progress') {
      prettifiedForSlack = `:large_purple_circle: ${prettifiedForSlack}`;
    }

    return slackClient.chat.postMessage({
      channel: conversationId,
      text: prettifiedForSlack
    });
  };

  #sendMsTeamsNotification = async ({ webhookUrl, message }: { webhookUrl: string; message: ProgressMessage }) => {
    return jsonFetch(webhookUrl, { method: 'POST', body: { text: message.text } });
  };
}

export const notificationManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new NotificationManager());
