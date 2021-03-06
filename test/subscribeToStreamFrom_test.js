var util = require('util');
var uuid = require('uuid');
var client = require('../src/client');

function createRandomEvent() {
  return client.createJsonEventData(uuid.v4(), {a: uuid.v4(), b: Math.random()}, {createdAt: Date.now()}, 'testEvent');
}

module.exports = {
  'Test Subscribe to Stream From Happy Path': function(test) {
    var self = this;
    var liveProcessing = false;
    var catchUpEvents = [];
    var liveEvents = [];
    function eventAppeared(s, e) {
      if (liveProcessing) {
        liveEvents.push(e);
        s.stop();
      } else {
        catchUpEvents.push(e);
      }
    }
    function liveProcessingStarted() {
      liveProcessing = true;
      var events = [createRandomEvent()];
      self.conn.appendToStream(self.testStreamName, client.expectedVersion.any, events);
    }
    function subscriptionDropped(connection, reason, error) {
      test.ok(liveEvents.length === 1, "Expecting 1 live event, got " + liveEvents.length);
      test.ok(catchUpEvents.length >= 1, "Expecting at least 1 catchUp event, got " + catchUpEvents.length);
      test.done(error);
    }

    var events = [createRandomEvent()];
    this.conn.appendToStream(self.testStreamName, client.expectedVersion.noStream, events)
      .then(function() {
        var subscription = self.conn.subscribeToStreamFrom(self.testStreamName, null, false, eventAppeared, liveProcessingStarted, subscriptionDropped);

        test.areEqual("subscription.streamId", subscription.streamId, self.testStreamName);
        test.areEqual("subscription.isSubscribedToAll", subscription.isSubscribedToAll, false);
        test.areEqual("subscription.readBatchSize", subscription.readBatchSize, 500);
        test.areEqual("subscription.maxPushQueueSize", subscription.maxPushQueueSize, 10000);
      });
  }
};

require('./common/base_test').init(module.exports);