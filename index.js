

var Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-delay-switch", "DelaySwitch", delaySwitch);
}


function delaySwitch(log, config) {
    this.log = log;
    this.name = config['name'];
    this.delay = config['delay'];
    this.disableSensor = config['disableSensor'] || false;
    this.timer;
    this.switchOn = false;
    this.motionTriggered = false;
    this.countMotionsTrigger = config['countMotionsTriggered']|| false;
    this.countMotionsTriggerPeriod = config['countMotionsTriggeredPeriod']|| 604800; //week by default
    
    this.cacheDirectory = HomebridgeAPI.user.persistPath();
    this.storage = require('node-persist');
    this.storage.initSync({dir:this.cacheDirectory, forgiveParseErrors: true});
    
  /* if (this.countMotionsTrigger) {
        var triggerCount = this.storage.getItemSync(this.name);
        if((cachedState === undefined) || (cachedState === false)) {
            this._service.setCharacteristic(Characteristic.On, false);
        } else {
            this._service.setCharacteristic(Characteristic.On, true);
        }
  }*/

}

delaySwitch.prototype.getServices = function () {
    var informationService = new Service.AccessoryInformation();

    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Delay Manufacturer")
        .setCharacteristic(Characteristic.Model, "Delay Model")
        .setCharacteristic(Characteristic.SerialNumber, "Delay Serial Number");


    this.switchService = new Service.Switch(this.name);


    this.switchService.getCharacteristic(Characteristic.On)
        .on('get', this.getOn.bind(this))
        .on('set', this.setOn.bind(this));
    
    var services = [informationService, this.switchService]
    
    if (!this.disableSensor){
        this.motionService = new Service.MotionSensor(this.name + ' Trigger');

        this.motionService
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', this.getMotion.bind(this));
        services.push(this.motionService)
    }

    return services;

}


delaySwitch.prototype.setOn = function (on, callback) {

    if (!on) {
        this.log('Stopping the Timer.');
    
        this.switchOn = false;
        clearTimeout(this.timer);
        this.motionTriggered = false;
        if (!this.disableSensor) this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(false);

        
      } else {
        this.log('Starting the Timer.');
        this.switchOn = true;
    
        clearTimeout(this.timer);
        this.timer = setTimeout(function() {
          this.log('Time is Up!');
          this.switchService.getCharacteristic(Characteristic.On).updateValue(false);
          this.switchOn = false;
            
          if (!this.disableSensor) {
              if (this.countMotionsTrigger) {
                    var triggerCount = this.storage.getItemSync(this.name);
                	this.storage.setItemSync(this.name, triggerCount+1);
               }
              this.motionTriggered = true;
              this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(true);
              this.log('Triggering Motion Sensor');
              setTimeout(function() {
                  this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(false);
                  this.motionTriggered = false;
              }.bind(this), 3000);
          }
          
        }.bind(this), this.delay);
      }
    
      callback();
}



delaySwitch.prototype.getOn = function (callback) {
    callback(null, this.switchOn);
}

delaySwitch.prototype.getMotion = function(callback) {
    callback(null, this.motionTriggered);
}
