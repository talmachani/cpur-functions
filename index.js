// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.notifyCurrentTurn = functions.database.ref('/new-stories/{storyId}')
    .onWrite((change, context) => {
     if (!change.after.exists()) {
        return null;
    }  
      let beforedata = change.before.val()
      let data = change.after.val()
      if (beforedata.story.turn === data.story.turn){
          return console.log("No need For next Trun notification",beforedata.story.turn, data.story.turn)
      }
      console.log('data ', data);          
      let turn = data.story.turn;
      let story_title = data.story.title;
      console.log('Current turn ', turn);
      let participants = data.story.participants;
      console.log('Current participants ', participants);
      let userTurnIndex = turn % participants.length;
      console.log('User Turn index ', userTurnIndex);
      const curentTurnUID = participants[userTurnIndex];
      console.log('User UID', curentTurnUID);


      // Get the list of device notification tokens.
      const getDeviceTokensPromise = admin.database()
          .ref(`/users/${curentTurnUID}/notificationToken`).once('value');
      console.log("getDeviceTokensPromise", getDeviceTokensPromise);    

      // The snapshot to the user's tokens.
      let tokensSnapshot;

      // The array containing all the user's tokens.
      let tokens;

      return Promise.all([getDeviceTokensPromise]).then(results => {
        tokensSnapshot = results[0];
        console.log("tokensSnapshot", tokensSnapshot);   

        // Check if there are any device tokens.
        // if (!tokensSnapshot.hasChildren()) {
        //   return console.log('There are no notification tokens to send to.');
        // }
        //console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');

        // Notification details.
        const payload = {
          notification: {
            title: story_title,
            body: `Hi, It's Time to Be Creative`
          }
        };
        // Listing all tokens as an array.
        tokens = Object.keys(tokensSnapshot.val());
        console.log("tokens", tokens);   
        // Send notifications to all tokens.
        return admin.messaging().sendToDevice(tokens, payload);
      }).then((response) => {
        // For each message check if there was an error.
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error('Failure sending notification to', tokens[index], error);
            // Cleanup the tokens who are not registered anymore.
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
            }
          }
        });
        return Promise.all(tokensToRemove);
      });
    });


exports.sendBuzzNotification = functions.database.ref('/buzzes/{buzzID}/')
    .onWrite((change, context) => {
     // Only edit data when it is first created.
    //  if (change.before.exists()) {
    //     return null;
    //   }
      // Exit when the data is deleted.
      if (!change.after.exists()) {
        return null;
      }
      let data = change.after.val()
      console.log('data ', data);          
      let turn = data.turn;
      const buzzerUid = data.fromUID;
      const buzzedUid = data.toUID;
      let storyTitle = data.storyTitle;
      let storyUid = data.storyUID;

      // If un-follow we exit the function.
      console.log('UID:', buzzerUid, 'Trigerd Buzz for UID', buzzedUid);

      // Get the list of device notification tokens.
      const getDeviceTokensPromise = admin.database()
      .ref(`/users/${buzzedUid}/notificationToken`).once('value');

      console.log("getDeviceTokensPromise", getDeviceTokensPromise);    

      // Get the follower profile.
      const getFollowerProfilePromise = admin.auth().getUser(buzzerUid);

      // The snapshot to the user's tokens.
      let tokensSnapshot;

      // The array containing all the user's tokens.
      let tokens;

      return Promise.all([getDeviceTokensPromise, getFollowerProfilePromise]).then(results => {
        tokensSnapshot = results[0];
        const buzzer = results[1];
        console.log("buzzer ", buzzer)

        // Check if there are any device tokens.
        // Notification details.
        let username = buzzer.email.split("@")[0];
        const payload = {
          notification: {
            title: storyTitle,
            body: `You Got a Buzz from ${username}.\n it's time to be creative!`
          }
        };

        // Listing all tokens as an array.
        tokens = Object.keys(tokensSnapshot.val());
        console.log("tokens", tokens);   
        // Send notifications to all tokens.
        return admin.messaging().sendToDevice(tokens, payload);
      }).then((response) => {
        // For each message check if there was an error.
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
          const error = result.error;
          if (error) {
            console.error('Failure sending notification to', tokens[index], error);
            // Cleanup the tokens who are not registered anymore.
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
            }
          }
        });
        return Promise.all(tokensToRemove);
      });
    });

    // Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
exports.changeStatus = functions.database.ref('/new-stories/{storyId}')
.onWrite((change, context) => {
    if (!change.after.exists()) {
        return null;
    }

   let data = change.after.val()
   console.log('data ', data);    
   let status = data.story.currentStatus;
   console.log('status ', status);    
   let minParticipants = data.story.minParticipants;
   let turn = data.story.turn;
   let maxround = data.story.numRounds;
   let participants = data.story.participants;
   if (status === 'PENDING'){
    console.log('PENDING: participants.length ', participants.length , 'minParticipants', minParticipants);    
        if (participants.length === minParticipants){
            return change.after.ref.child('story').child('currentStatus').set('IN_PROGRESS');
        }
    }else if (status === 'IN_PROGRESS'){
        console.log('IN_PROGRESS: content.length ', content.length , 'turn', turn);
        round = turn / participants.length;
        if (round === maxround){
            return change.after.ref.child('story').child('currentStatus').set('COMPLETED');
        }
    }else{
        return null;
    }
    return null;
});