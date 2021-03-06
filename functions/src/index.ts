import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'
admin.initializeApp(functions.config().firebase)
const cors = require("cors")({ origin: true });


 export const isDaddy = functions.region('asia-east2').https.onRequest((request, response) => {
   cors(request, response, () => {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.send({isDaddy:"sobydanny@gmail.com"});
   });
 });
 export const newEventAdded = functions.region('asia-east2').database.ref('{classID}/Events/{eventId}')
 .onCreate(async (snapshot,context) => {
   const classID = context.params.classID
   const eventData = snapshot.val()
   const eventTitle = eventData.DataType
   var eventDescription = eventData.Description
   var prefix :string = ''
   if (eventTitle != "News") {
    prefix = "New "
    eventDescription = eventData.Description
   }
   else {
    eventDescription = eventData.Description.slice(0,70) + "...."
   }
   const notificationPayload = {
     notification: {
       title: prefix + eventTitle,
       body: eventDescription,
       click_action:"FCM_PLUGIN_ACTIVITY",
     },
     data: {
      path: '/view-events',
   },
   }
   const tokens: any = [];
   const users = admin.database().ref('USERS');
   users.once('value', async (data) => {
     
     if (data) {
      const userData = data.val()
      var keys = Object.keys(userData)
      for ( var i=0; i<keys.length;i++) {
        var key = keys[i];
        var token = await userData[key].Profile.Device;
        var notificationClass = await userData[key].Profile.Class
        if (token && tokens.includes(token) != true && classID == notificationClass) {
          tokens.push(token)
        }
      }
     }
     //console.log(tokens)
     return admin.messaging().sendToDevice(tokens, notificationPayload)
  });
  
   
  })
  export const newNotesAdded = functions.region('asia-east2').database.ref('{classID}/Notes/{notesID}')
 .onCreate(async (snapshot,context) => {
   const classID = context.params.classID
   const notesData = snapshot.val()
   const dataType = notesData.DataType
   const subject = notesData.subject
   const Title = notesData.Title
   const notificationPayload = {
     notification: {
       title: "New " + dataType,
       body: subject + "\n" + Title,
       click_action:"FCM_PLUGIN_ACTIVITY",
     },
     data: {
      path: '/notes',
   },
   }
   const tokens: any = [];
   const users = admin.database().ref('USERS');
   users.once('value', async (data) => {
     
     if (data) {
      const userData = data.val()
      var keys = Object.keys(userData)
      for ( var i=0; i<keys.length;i++) {
        var key = keys[i];
        var token = await userData[key].Profile.Device;
        var notificationClass = await userData[key].Profile.Class
        if (token && tokens.includes(token) != true && classID == notificationClass) {
          tokens.push(token)
        }
      }
     }
     console.log(notificationPayload)
     return admin.messaging().sendToDevice(tokens, notificationPayload)
  });
  
   
  });
  export const pendingAssignmentReminder = functions.region('asia-east2').https.onRequest((request, response) => {
    const currTimeIST = new Date(new Date().getTime() + (330 + new Date().getTimezoneOffset())*60000);
    response.send("Notification sent at(IST):-"+ currTimeIST)
    const classes = admin.database().ref('AvailableClass')
    classes.once('value',data=>{
      const classes = Object.values(data.val())
      //console.log(classes)
      classes.forEach((cls)=>{
        var assignments = admin.database().ref(cls + "/Events")
        assignments.once('value',data=>{
          if (data.val()) {
            const assignmentIDs = Object.keys(data.val())
            assignmentIDs.forEach((assignmentID)=>{
              const devices: any = [];
              const userReceivedNotification: any = [];
              var assignment = admin.database().ref(cls + "/Events/"+assignmentID)
              assignment.once('value', data=>{
                const assignmentVal = data.val()
                //Send notification about every assignment
                if (assignmentVal.DataType=="Assignment") {
                  const sendNotification = checkTime(assignmentVal['Submission Date'])[0]
                  const notificationType = checkTime(assignmentVal['Submission Date'])[1]
                  if (sendNotification && notificationType) {
                    console.log("Sending....")
                    var getDevices = new Promise((res,rej) => {
                      const users = admin.database().ref('USERS');
                        //get user's device who have not done assignment for the assignments
                        users.once('value', async data=>{
                          const userIDs = Object.keys(data.val())
                          const totalUser = userIDs.length
                          //Fix-ME
                          //looping till totalUser as nested hell won't read the last value and will resolve the promise
                          for (var i=0;i<=totalUser;i++) {
                            var userID = userIDs[i];
                              var userData = admin.database().ref('USERS/'+userID);
                              await userData.once('value', async data=>{
                                var user = data.val()
                                if ( i != totalUser) {
                                  const device = user.Profile.Device
                                  const userClass = user.Profile.Class
                                  if (cls == userClass && device && devices.includes(device) != true && i!=totalUser) {
                                    var userAssignments = admin.database().ref('USERS/'+userID + "/Assignments/" +assignmentID);
                                    await userAssignments.once('value',async data => {
                                      var userAssignment = data.val()
                                      if (userAssignment) {
                                        if (!userAssignment.assignmentDone) {
                                          //Check whether reminder is sent and if not send one
                                          if (!userAssignment[notificationType.toString()]) {
                                             //Send notification and update reminder1 to true
                                            //add device id to the list
                                            userReceivedNotification.push(user.Profile.Name)
                                            devices.push(device)
                                            userAssignments.update({
                                              [notificationType.toString()]: true,
                                              [notificationType+'At']: currTimeIST,
                                            });
                                          }
                                        }
                                      }
                                      //data not found means not interacted with assignment and probably not done
                                      //send a reminder to this fella
                                      //this reminder will create the data no need to update for second as data will be existing
                                      else {
                                        userReceivedNotification.push(user.Profile.Name)
                                        devices.push(device)
                                        userAssignments.update({
                                          [notificationType.toString()]: true,
                                          [notificationType+'At']: currTimeIST,
                                        });
                                      }
                                    })
                                  }
                                }
                              })
                          }
                          res() //res the promise as loop ends
                        })
                    })
                    ////Send notification to the devices
                    getDevices.then(()=>{
                      sendReminderNotification(devices,assignmentVal.Subject,notificationType);
                      console.log(devices)
                      console.log(userReceivedNotification)
                      console.log("Notification sent to\nClass:- "+cls+"\nAssignmentId:- "+assignmentID+" Total devices:-"+devices.length)
                    }).catch((err)=>{
                      console.log("Error - "+err)
                    })
                  }
                }
              })
            })
          }
          
        })
      })
    })

  });
 //check time if notification time has come or not
  function checkTime(submissionDate:string) {
    //+19800000 to convert to utc
    //submission time 8 in the morning
    const actualSubDate = new Date(submissionDate).getTime() + 8*60*60*1000 - 19800000;
    const currTime = new Date().getTime()
    const timeLeft = actualSubDate - currTime
    if (timeLeft <= 48*3600*1000 && timeLeft >= 42*3600*1000) {
      //console.log("1st notification time hours left " + ((actualSubDate - currTime)/(3600*1000)))
      return [true,'firstNotification'];
    }
    else if (timeLeft >= 8*3600*1000 && timeLeft <= 12*3600*1000) {
      //console.log("Tommorow is the submission date hours left "+ (timeLeft/(3600000)))
      return [true,'secondNotification'];
    }
    //console.log("Not the time for notiffication")
    return [false,null];
    
  }
  //send notification
  function sendReminderNotification(devices:any,subject:string,type: string | boolean | null) {
    if (type == "firstNotification") {
      const notificationPayload = {
        notification: {
          title: subject + ' Assignment Pending!',
          body: '2 Days left to submit your ' + subject + " Assignment",
          click_action:"FCM_PLUGIN_ACTIVITY",
        },
        data: {
         path: '/view-events',
        },
      }
      return admin.messaging().sendToDevice(devices, notificationPayload);
    }
    else if (type == "secondNotification") {
      const notificationPayload = {
        notification: {
          title: subject + ' Assignment Pending!',
          body: 'Tommorow is the submission date for ' + subject + " Assignment",
          click_action:"FCM_PLUGIN_ACTIVITY",
        },
        data: {
         path: '/view-events',
        },
      }
      return admin.messaging().sendToDevice(devices, notificationPayload);
    }
    return
  }
  export const isCertified = functions.region('asia-east2').database.ref('USERS/{userID}/Profile/isCertified')
 .onUpdate(async (snapshot,context) => {
   const userID = context.params.userID
   const isCertified = snapshot.after.val()
   const users = admin.database().ref('USERS/'+userID+"/Profile");
   users.once('value', (data) => {
    var profile = data.val();
    var userDevice = profile['Device'];
    var userName = profile['Name'];
    const notificationPayloadisCertified = {
      notification: {
        title: "Certification",
        body: "Hey " + userName +", You're now Certified",
        click_action:"FCM_PLUGIN_ACTIVITY",
      },
      data: {
        path: '/profile',
     },
    }
    const notificationPayloadisNotCertified = {
      notification: {
        title: "Certification Removed",
        body: "Hey " + userName +", You're no longer Certified",
        click_action:"FCM_PLUGIN_ACTIVITY",
      },
      data: {
        path: '/profile',
     },
    }
    if (isCertified) {
      console.log(notificationPayloadisCertified)
      return admin.messaging().sendToDevice(userDevice, notificationPayloadisCertified);
    }
    else if (!isCertified) {
      console.log(notificationPayloadisNotCertified)
      return admin.messaging().sendToDevice(userDevice, notificationPayloadisNotCertified);
    }
    return;

  });
  });
  export const assignmentSubmissionUpdate = functions.region('asia-east2').database.ref("{classID}/Events/{eventId}/Submission Date")
 .onUpdate(async (snapshot,context) => {
   const classID = context.params.classID
   const eventID = context.params.eventId
   const availUsers = admin.database().ref('USERS');
   availUsers.once('value',data =>{
    var userIDs = Object.keys(data.val())
    userIDs.forEach((userID)=>{
      var userData = admin.database().ref('USERS/'+userID);
      userData.once('value',data=>{
        const user = data.val()
        if (user.Profile.Class == classID) {
          const assignment = admin.database().ref('USERS/'+userID+'/Assignments/'+eventID);
          assignment.once('value',data=>{
            const assignmentData = data.val();
            if (assignmentData) {
              if (!assignmentData.assignmentDone) {
                assignment.update({
                  firstNotification: false,
                  secondNotification: false,
                });
              }
            }
            else {
              return;
            }
           
          })
        }
      })
    })
   })
  });