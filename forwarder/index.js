/* Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */

/*
 * Autoscaler Forwarder function
 *
 * * Forwards PubSub messages from the Scheduler topic to the Poller topic.
 */

const {PubSub} = require('@google-cloud/pubsub');

// GCP service clients
const pubSub = new PubSub();

function log(message, severity = 'DEBUG', payload) {
  // Structured logging
  // https://cloud.google.com/functions/docs/monitoring/logging#writing_structured_logs

  if (!!payload) {
    // If payload is an Error, get the stack trace.
    if (payload instanceof Error && !!payload.stack) {
      if (!!message ) {
         message = message + '\n' + payload.stack;
      } else {
         message = payload.stack;
      }
    }
  }
  const logEntry = {
    message: message,
    severity: severity,
    payload : payload
  };
  console.log(JSON.stringify(logEntry));
}

exports.forwardFromHTTP = async (req, res) => {
  try {
    const payloadString =
        '[{"projectId": "spanner-scaler" "instanceId": "my-spanner", "scalerPubSubTopic": "projects/spanner-scaler/topics/my-scaling", "minNodes": 1, "maxNodes": 3, "stateProjectId" : "spanner-scaler"}]';
    const payload = Buffer.from(payloadString, 'utf8');

    JSON.parse(payload.toString());  // Log exception in App project if payload
                                     // cannot be parsed
    const pollerTopic = pubSub.topic(process.env.POLLER_TOPIC);
    pollerTopic.publish(payload);

    res.status(200).end();
  } catch (err) {
    log('failed to process payload: \n' + payloadString, 'ERROR', err);
    res.status(500).end(err.toString());
  }
};

exports.forwardFromPubSub = async (pubSubEvent, context) => {
  try {
    const payload = Buffer.from(pubSubEvent.data, 'base64');
    JSON.parse(payload.toString());  // Log exception in App project if payload
                                     // cannot be parsed

    const pollerTopic = pubSub.topic(process.env.POLLER_TOPIC);
    pollerTopic.publish(payload);

    console.log('Poll request forwarded to ' + process.env.POLLER_TOPIC);
  } catch (err) {
    log('failed to process payload: \n' + payload, 'ERROR', err);
  }
};
