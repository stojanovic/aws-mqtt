'use strict';

var identityPoolIdInput = document.getElementById('identity-pool'),
  connectButton = document.getElementById('connect'),
  messageText = document.getElementById('message'),
  messageButton = document.getElementById('post'),
  topicName = document.getElementById('topic'),
  subscribeButton = document.getElementById('subscribe'),
  connectBlock = document.getElementById('connect-block'),
  subscribeBlock = document.getElementById('subscribe-block'),
  messageBlock = document.getElementById('message-block'),
  messagesList = document.getElementById('messages'),
  client, // Expose client to the console
  credentials,
  topic;

// Connect client on a click to the connect button
connectButton.addEventListener('click', function(e) {
  if (!identityPoolIdInput.value)
    return alert('Identity Pool Id cannot be empty');

  connect(identityPoolIdInput.value);
}, false);

// Subscribe to a topic on click on a subscribe button
subscribeButton.addEventListener('click', function(e) {
  if (!topicName.value)
    return alert('Topic name cannot be empty');

  subscribe(topicName.value);
});

// Send a message on click on a post button
messageButton.addEventListener('click', function(e) {
  if (!messageText.value)
    return alert('Topic name cannot be empty');

  publishMessage(messageText.value, topic);
});

// Add message to the list
function addMessage(message, className) { // className = 'system', 'user', 'others'
  messagesList.innerHTML += '<li class="' + className + '">' + message + '</li>'
}

function subscribe(topicName) {
  topic = topicName;

  // subscribe to a topic
  client.subscribe(topic);

  // publish a lifecycle event
  var message = new Paho.MQTT.Message('{"id":"' + credentials.identityId + '"}');
  message.destinationName = topic;
  console.log(message);
  addMessage('Subscribed to: ' + topic, 'system');
  addMessage('{"id":"' + credentials.identityId + '"}', 'user');
  client.send(message);
}

function publishMessage(messageText, topicName) {
  var message = new Paho.MQTT.Message(messageText);
  message.destinationName = topicName;
  console.log(message);
  addMessage(messageText, 'user');
  client.send(message);
}

// Cognito
function connect(identityPoolId) {
  // Initialize the Amazon Cognito credentials provider
  AWS.config.region = 'us-east-1'; // Region
  credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: identityPoolId
  });

  // Getting AWS creds from Cognito is async, so we need to drive the rest of the mqtt client initialization in a callback
  credentials.get(function(err) {
    if (err)
      return console.log(err);

    var requestUrl = SigV4Utils.getSignedUrl('wss', 'a2st5c4dcz8fyt.iot.us-east-1.amazonaws.com', '/mqtt', 'iotdevicegateway', 'us-east-1', credentials.accessKeyId, credentials.secretAccessKey, credentials.sessionToken);

    initClient(requestUrl);
  });
}

function init() {
  // do setup stuff
}

// Connect the client, subscribe to the drawing topic, and publish a "hey I connected" message
function initClient(requestUrl) {
  var clientId = String(Math.random()).replace('.', '');
  client = new Paho.MQTT.Client(requestUrl, clientId);
  var connectOptions = {
    onSuccess: function () {
      console.log('connected');
      addMessage('Connected', 'system');
      connectBlock.classList.toggle('hidden');
      subscribeBlock.classList.toggle('hidden');
      messageBlock.classList.toggle('hidden');
    },
    useSSL: true,
    timeout: 3,
    mqttVersion: 4,
    onFailure: function (err) {
      console.error('connect failed', err);
    }
  };
  client.connect(connectOptions);

  client.onMessageArrived = function (message) {
    console.log(message);

    try {
      console.log("msg arrived: " +  message.payloadString);
      addMessage(message.payloadString, 'others');
    } catch (e) {
      console.log("error! " + e);
    }

  };

  client.onConnectionLost = console.log;
}
