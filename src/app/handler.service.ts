import { Injectable } from '@angular/core';
import { AlertController, LoadingController,NavController  } from '@ionic/angular';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/messaging'
import * as firebase from 'firebase/app';
import { Router, RouterModule } from '@angular/router';
import { LocalNotifications, ELocalNotificationTriggerUnit } from '@ionic-native/local-notifications/ngx';
import { Network } from '@ionic-native/network/ngx';
import { FCM } from '@ionic-native/fcm/ngx';
import { Platform } from '@ionic/angular';
@Injectable({
  providedIn: 'root'
})
export class HandlerService {
  alert_title:string;
  alert_message:string;
  cancelButton:any="Close"
  okButton:string;
  currUser:any;
  currUserProfileData:any;
  isCertified:boolean=false;
  userProfileEmailVerified:boolean;
  userClass:string;
  percentUploaded: string;
  uploading: HTMLIonLoadingElement;
  constructor(
    private alertCtrl:AlertController,
    private network:Network,
    private router: Router,
    public loadingCtrl:LoadingController,
    private localNotifications: LocalNotifications,
    public fcm:FCM,
    public platform:Platform,
    private nav:NavController,
  ) { }
  // high alert with no off button
  // using it to force to do something and not allowing to do anything else unless it's done
  async showHighAlert() {
    let alert = await this.alertCtrl.create({
      header: this.alert_title,
      message: this.alert_message,
      backdropDismiss: false,
    });
    if (this.currUser.emailVerified != true) {
      alert.present();
    }
  }
  async showAlert(title,message) {
    let alert = await this.alertCtrl.create({
      header: title,
      message: message,
      backdropDismiss: false,
      buttons: [
        {
          text: this.cancelButton,
          role: 'cancel',
          cssClass: 'primary',
          handler: () => {
          }
        }
      ]
    });
    alert.present();

  }
  async showVerifyAlert() {
    let alert = await this.alertCtrl.create({
      header: this.alert_title,
      message: this.alert_message,
      backdropDismiss: false,
      buttons: [
        {
          text: this.okButton,
          cssClass: 'primary',
          handler: (user) => {
            console.log(this.okButton +"says\n" + this.currUser)
            this.onVerifyEmail()
          }
        }
      ]
    });
    alert.present();

  }

  ///
  async presentLoading(loadingtext,time:number) {
    const loading = await this.loadingCtrl.create({
      message: loadingtext,
      //duration: time,
      spinner: "crescent",
      cssClass: 'loading',
      backdropDismiss: false,
    });
    /*this.nav.addEventListener('ionNavWillChange', (event: any) => {
      console.log("changing")
    });*/
    await loading.present();
     setTimeout(() => {
       //console.log(loading.isConnected)
       //console.log("loading ctrl")
      //var loader = this.loadingCtrl.getTop()
      if (loading.isConnected) {
        //this.loadingCtrl.dismiss()
        loading.dismiss()
        var title = "TimeOut!";
        var msg="No or Weak Internet connection"
        this.showAlert(title,msg);
      }
      else {
        console.log("already dismissed")
      }
    },time);
    await loading.onDidDismiss()
    console.log('Loading dismissed!');
  }
  dismissLoading() {
    var loading = this.loadingCtrl.getTop()
    loading.then((loader)=>{
      if (loader) {
        loader.dismiss()
      }
    }).catch((err)=>{
      console.log("no loader"+ err)
    })
  }
  //
  connectUSER() {
    firebase.auth().onAuthStateChanged((user) => {
      //console.log(user)
      if (user) {
        this.currUser = user
        let users = firebase.database().ref("USERS/" + user.uid + "/Profile");
        this.currUserProfileData = users;
        users.on('value', (data) => {
          let profile = data.val();
          this.isCertified = profile.isCertified;
          this.userClass = profile.Class
          this.userProfileEmailVerified = profile.EmailVerified;
        })
      }
      else {
        console.log("handler says not logge in")
      }
    })
  }
  // check if email is verified or not keep sending user to profile page till it's verifid
  checkEmailVerification() {
    if (this.currUser.emailVerified != true && this.currUser.isAnonymous != true) {
      this.router.navigateByUrl('/profile')
      let tittle = "Verify Email"
      let msg = "Your Email " +this.currUser.email+ " is not yet verified"
      this.showAlert(tittle,msg)
    }
  }
  dateToNormal(date) {
    var months = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var dateToGMT = new Date(date);
    var normalDate = dateToGMT.getDate() + ' ' + months[dateToGMT.getMonth()] + ',' + dateToGMT.getFullYear();
    var normalDateWithTime = (dateToGMT.getHours()) + ':' + (dateToGMT.getMinutes())+ " " + normalDate;
    return normalDate;
  }
  //continuous calling function
  timeAgo(date) {
    var currDate = new Date();
    var givenDate = new Date(date);
    var timeDifference = currDate.getTime() - givenDate.getTime();
    var secondsDifference = Math.floor(timeDifference / (1000));
    var minuteDifference = Math.floor(timeDifference / (1000 * 60));
    var hourDifference = Math.floor(timeDifference / (1000 * 3600));
    var dayDifference = Math.floor(timeDifference / (1000 * 3600 * 24));
    var monthDifference = Math.floor(timeDifference / (1000 * 3600 * 24 * 30));
    var yearDifference = Math.floor(timeDifference / (1000 * 3600 * 24 * 365))
    var ago;
    if (secondsDifference > 0 && secondsDifference < 60) {
      ago = "few seconds ago"
    }
    else if (minuteDifference >= 1 && minuteDifference < 60) {
      ago = minuteDifference + " minutes ago"
    }
    else if (hourDifference >= 1 && hourDifference < 24) {
      ago = hourDifference + " hours ago"
    }
    else if (dayDifference >= 1 && dayDifference < 30) {
      ago = dayDifference + " days ago"
    }
    else if (monthDifference >= 1 && monthDifference < 12) {
      ago = monthDifference + " days ago"
    }
    else if (yearDifference >= 1) {
      ago = yearDifference + " year ago"
    }
    //console.log(ago)
    return ago;
  }
  /*
  checkPendingAssignment(userClass,userID) {
    const assignments = firebase.database().ref(userClass + "/Events");
    assignments.on('value', data => {
      const eventData = data.val()
      var keys = Object.keys(eventData)
      for ( var i=0; i<keys.length;i++) {
        const key = keys[i];
        const dataType = eventData[key].DataType;
        const subject = eventData[key].Subject
        const submissionDate = new Date(eventData[key]['Submission Date']).getTime()
        const currDate = new Date().getTime()
        const hoursLeft = ((submissionDate-currDate) / (1000 * 3600));
        const id = this.uniqueIDGenerator(key);
        if (dataType == 'Assignment') {
          let userAssignmentProfile = firebase.database().ref("USERS/" + userID + "/Assignments");
          userAssignmentProfile.on('value',data => {
            var userAssignments = data.val()
            if (userAssignments[key]) {
              var isDone = userAssignments[key].assignmentDone
              if (!isDone) {
                this.localNotifications.cancel(id).then(()=>{
                  this.pendingAssignmentPrimaryNotification(id,subject,submissionDate)
                })
                //this.pendingAssignmentTertiaryNotification(id,subject,submissionDate)
                //console.log(subject +'\n'+ hoursLeft + " hours left and i is " +i)
              }
            }
            else {
              this.localNotifications.cancel(id).then(()=>{
                this.pendingAssignmentPrimaryNotification(id,subject,submissionDate)
              })
              //this.pendingAssignmentTertiaryNotification(id,subject,submissionDate)
              //console.log(subject +'\n'+ hoursLeft + " hours left and i is " + i)
            }
          })
        }
        }
      
      
    })
  }*/
  /*
  //Send 48 hrs ag and 10 hours ago
  pendingAssignmentPrimaryNotification(key,subject,submissionDate) {
    const actualSubmissionTime = submissionDate + (1000*3600*8)
    if (actualSubmissionTime > new Date().getTime()) {
  
      this.localNotifications.schedule([{
        id : key,
        title: subject + ' Assignment Pending!',
        text: '2 Days left to submit your ' + subject + " Assignment",
        lockscreen: true,
        foreground: true,
        trigger: { at: new Date(actualSubmissionTime - (48*1000*3600)) } //48Hrs ago
      },
      {
        id : key, //making it more unique
        title: subject + ' Assignment Pending!',
        text: 'Tommorow is the submission date for ' + subject + " Assignment",
        lockscreen: true,
        foreground: true,
        trigger: { at: new Date(actualSubmissionTime - (10*3600*1000)) },
      }
    ]
    );
    }

  }*/
  //Generate unique id for keys of events for notification
  //(uid).toString(36) will convert number to original string
  uniqueIDGenerator(key) {
    var keyWithoutsChar1 = key.replace(/_/g,"0");
    var finalKey = keyWithoutsChar1.replace(/-/g,"1")
    const keyLength = finalKey.length
    const keyPart1 = finalKey.slice(0,10);
    const keyPart2 = finalKey.slice(10,keyLength);
    const uid1 = parseInt(keyPart1, 36);
    const uid2 = parseInt(keyPart2,36);
    const uidString = uid1.toString() + uid2.toString()
    const uid = parseInt(uidString)
    //const uid = uid1 + uid2;
    //console.log(key);
    //console.log(finalKey +" and uidstring is "+ uidString + "\n and uid is" + uid);
    return uid1;

    //console.log(finalKey+ "\nuid1 is " +uid1+" uid2 is " +uid2+ "\n using uid1 + uid2 " + uid1 + uid2 +"\n key from uid is " +"\nkey part 10 " + keyPart1 + "\n rest key is " + keyPart2);
  }
  onVerifyEmail() {
    this.currUser.sendEmailVerification()
    this.alert_message = "Verification Email sent to '" +this.currUser.email+ "'";
    this.showHighAlert()
  }
  async connectionAlert(show:boolean) {
    let alert = await this.alertCtrl.create({
      header: "Connection Unavailable!",
      message: "Internet not available<br>Make sure you're connected to the internet",
      backdropDismiss: false,
      buttons: [
        {
          text: "Retry",
          role: 'cancel',
          cssClass: 'primary',
          handler: () => {
            this.checkInternetConnection()
          }
        }
      ]
    });
    //alert.present()
    if(show == false) {
      console.log("show asss")
    }
    else if (show == true) {
      console.log("show alert not connected")
      await alert.present();
    }

  }
  openNotification() {
    this.fcm.onNotification().subscribe( data => {
      if(data.wasTapped){
        //Notification was received on device tray and tapped by the user.
        console.log("notification received type:- " + data.path)
        //console.log(JSON.stringify(data.type));
        console.log('Received in background');
        //path = data.path
        this.router.navigateByUrl(data.path);
        return true;
      }
      else {
        //Notification was received in foreground. Maybe the user needs to be notified.
        console.log("notification received type:- " + data.path)
        //console.log(JSON.stringify(data.type));
        console.log('Received in foreground');
        this.router.navigateByUrl(data.path);
        return true;
        //path = data.path
      }
    });
    return false;
  }
  cleanOpenApp() {
    console.log("notification sent")
      var checkForNotification = new Promise((res,rej)=>{
        res(this.openNotification())
      })
      checkForNotification.then((openByNotification)=>{
        if (!openByNotification) {
          console.log("going to profile")
          return this.router.navigateByUrl('/profile');
        }
        else {
          console.log("going to notification path");
          return;
        }
        ///console.log("promise is "+openByNotification)
      })
      
  }

  async checkInternetConnection() {
    let alert = await this.alertCtrl.create({
      header: "Connection Unavailable!",
      message: "Internet not available<br>Make sure you're connected to the internet",
      backdropDismiss: false,
      buttons: [
        {
          text: this.cancelButton,
          role: 'cancel',
          cssClass: 'primary',
          handler: () => {
            this.checkInternetConnection()
          }
        }
      ]
    });
    var connectedRef = firebase.database().ref(".info/connected");
    connectedRef.on("value", (snap) => {
      //console.log(snap.val())
      if (snap.val() === false) {
        setTimeout(()=>{
          connectedRef.once('value', (snap)=>{
            if (snap.val() === false && !this.platform.pause) {
              //disconnected
              console.log("disconnected")
              alert.present()
            } 
            else {
              //connected
              alert.dismiss()
              console.log("connected")
            }
          })
        },10000)
      }
    });
  }
  notificationButton() {
    this.localNotifications.on('done').subscribe(notification =>{
      console.log("Notification done clicked" + notification)
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          let users = firebase.database().ref('USERS');
          users.child(user.uid + '/Profile').update({
            TestValue: new Date(),
          });
        }
      })
    })
  }
}
