'use strict';

var fs = require('fs-extra');
var exec = require('child_process').exec;
var os = require('os');
var ifconfig = require('/volumio/app/plugins/system_controller/network/lib/ifconfig.js');
var libQ = require('kew');
var net = require('net');
var mpdPort = 6599;

const okay_response = 'OK\n';

// Define the UpnpInterface class
module.exports = UpnpInterface;

function UpnpInterface (context) {
  var self = this;
  // Save a reference to the parent commandRouter
  self.context = context;
  self.commandRouter = self.context.coreCommand;
  self.logger = self.commandRouter.logger;
}

UpnpInterface.prototype.onVolumioStart = function () {
  var self = this;

  self.context.coreCommand.pushConsoleMessage('[' + Date.now() + '] Starting Upmpd Daemon');
  self.startUpmpdcli();

  var boundMethod = self.onPlayerNameChanged.bind(self);
  self.commandRouter.executeOnPlugin('system_controller', 'system', 'registerCallback', boundMethod);

  var localport = 6599;
  var remoteport = 6600;
  var remoteaddr = '127.0.0.1';
  
  // need helper routines to emulate mpd behaviour
  self.helper = require('../../user_interface/mpdemulation/helper.js');
  self.request = '';
  self.no = 0;
  //self.song = {file: ''};
  self.songStr = ''; // string variable to keep mpd currentsong
  self.statusStr = okay_response;   // string variable to keep mpd status
  self.playlistStr = okay_response; // string variable to keep mpd playlist
  self.duration = 0;
  self.TimeOffset = 0;
  self.idling = false;

  self.server = net.createServer(function (socket) {
    socket.setEncoding('utf8');
    const ignoredCmds = ['status', 'currentsong'];
    const mpdServices = ['mpd','webradio'];

    socket.on('data', function (msg) {
      var message = msg.toString();
      if (message) self.request = message.trim();
      // console.log('Upnp client: '+message );
      if (!ignoredCmds.includes(self.request) && !self.request.startsWith('playlistinfo "')) self.logger.info('Upnp client: ' + self.request + '---');
      
      if (message.indexOf('addid') !== -1) {
        self.logger.info('Starting UPNP Playback');
        self.prepareUpnpPlayback();

        setTimeout(function () {
          serviceSocket.write(msg);
        }, 500);
      } else if (message.indexOf('clear') !== -1) {
        self.clearQueue();
        setTimeout(function () {
          serviceSocket.write(msg);
        }, 300);
      } else if (message.indexOf('currentsong') !== -1) {
//          var dummy = 'file: http://127.0.0.1:9790/minimserver/*/INTERNAL/Music/FLAC-CD/Kokoroko/KOKOROKO*20-*20KOKOROKO/KOKOROKO*20-*20KOKOROKO*20-*2003*20Uman.flac \nTitle: Uman \nArtist: KOKOROKO \nPos: 0 \nId: 82 \nOK\n';
//          self.logger.info('Returning dummy var in response to currentsong: ' + dummy);
//          socket.write(dummy);
        setTimeout(function () {
          serviceSocket.write(msg);
        }, 300);
      } else {
          if (message.indexOf('idle') !== -1) self.idling = true;
          if (message.indexOf('noidle') !== -1) self.idling = false;
        try {
          serviceSocket.write(msg);
        } catch (e) {
          console.log('Upnp error (requesting ' + message + '): ' + e);
        }
      }
    });
    socket.on('error', function (error) {
      console.log('Upnp upmpdcli error: ' + error);
    });

    var serviceSocket = new net.Socket();
    serviceSocket.connect(parseInt(remoteport), remoteaddr, function () {
    });
    serviceSocket.on('data', function (data) {
      //self.logger.info('Upnp client: reply to ' + self.request + '\n' + data);
      //self.logger.info('Upnp client: ' + JSON.stringify(parseKeyValueMessage(data.toString())));
      //checkresponse(data);
      socket.write(checkresponse(data));
    });

    serviceSocket.on('error', function (error) {
      self.logger.error('Upnp client error: ' + error);
    });
  });
  try {
    self.server.listen(localport);
  } catch (e) {
    self.logger.error('Failed listening to UPNP Port: ' + e);
  }
    function checkresponse(data){
        let resp = data.toString();
        let tmp = {};
   //     self.logger.info('Upnp client: checking response...');
        self.no++;
        if (resp.startsWith('changed')){
            if (self.idling){
                self.changes = resp;
                self.idling = false;
                if ((resp.indexOf('player') === -1) && (resp.indexOf('playlist') !== -1)) resp = 'changed: playlist\nchanged: player' + okay_response;  // add player
            };
            self.logger.info('Upnp client: idle returned:\n' + self.changes);
        } else if (self.request.startsWith('status')){
            if (resp.startsWith('volume:')) {
                self.statusStr = resp;
                let mpdState = parseKeyValueMessage(self.statusStr);
                if (mpdState){
                    // adjust state for time offset and duration
                    self.helper.copyStatus(mpdState, self.TimeOffset, self.duration);
                    resp = self.helper.printStatus() + okay_response;
                }
            }
        } else if (self.request.startsWith('currentsong')){
            if (resp.startsWith('file') && (self.songStr != resp)) {
                self.songStr = resp;
                let state = parseKeyValueMessage(self.statusStr);
                if ('time' in state) {
                        let arrayTimeData = state.time.split(':');
                        self.duration = Math.round(Number(arrayTimeData[1]));
                        if (!self.duration) {
                            self.TimeOffset = state.elapsed;
                        } else self.TimeOffset = 0;
                }
                self.helper.copySong(parseKeyValueMessage(self.songStr));
                self.logger.info('Upnp client: song changed! Idling? ' + self.idling);  
                if (self.idling) {
                    resp += 'changed: playlist\nchanged: player' + okay_response;
                    self.idling = false;
                }
                // Check Volumio State as well
                let volumioState = self.commandRouter.volumioGetState();
                if (volumioState){
                    self.duration = volumioState.duration;
                    self.helper.setSong(volumioState);
                    self.logger.info('Upnp client: updated song\n' + self.helper.printSong()); 
                }
                if (self.songStr) self.logger.info('Upnp client: song\n' + self.songStr + ' with Offset: ' + self.TimeOffset);
            }   
        } else if (self.request.startsWith('playlist')){
            if (self.request.length < 14) self.playlistStr = resp;
//         self.logger.info('Upnp client: return song: ' + JSON.stringify(self.songinfo));
        } else {
//            self.logger.info('Upnp client: reply to ' + self.request + '\n' + data);
        }
        if (self.no % 50 == 0) {
            self.logger.info('Upnp client: number of requests: ' + self.no);
//            if (self.statusStr) self.logger.info('Upnp client: status ' + JSON.stringify(parseKeyValueMessage(self.statusStr)));
            if (self.songStr) self.logger.info('Upnp client: song ' + JSON.stringify(parseKeyValueMessage(self.songStr)) + ' with Offset: ' + self.TimeOffset);
//            if (self.playlistStr) self.logger.info('Upnp client: Playlist ' + self.playlistStr);      
//            let volumioState = self.commandRouter.volumioGetState();
//            if (volumioState){
//                self.duration = volumioState.duration;
////                volumioState.seek -= self.TimeOffset*1000;
////                self.logger.info('Upnp client: Fake state ' + self.helper.printStatus(volumioState));
//            }
//            let mpdState = parseKeyValueMessage(self.statusStr);
//            if (mpdState){
//                self.helper.copyStatus(mpdState, self.TimeOffset, self.duration);
//                self.logger.info('Upnp client: Fake state ' + self.helper.printStatus()+ okay_response);
//            }
        }
        return resp;
    };
  
    return libQ.resolve();
};

UpnpInterface.prototype.onPlayerNameChanged = function (playerName) {
  var self = this;

  self.onRestart();
};

UpnpInterface.prototype.getCurrentIP = function () {
  var self = this;
  var defer = libQ.defer();

  var ipAddresses = self.commandRouter.getCurrentIPAddresses();
  ipAddresses.then((result) => {
    if (result.wlan0 && result.wlan0 !== '192.168.211.1') {
      defer.resolve(result.wlan0);
    } else {
      defer.resolve(result.eth0);
    }
  }).fail(function (err) {
    defer.resolve('');
  });

  return defer.promise;
};

UpnpInterface.prototype.onStop = function () {
  var self = this;
  var defer = libQ.defer();

  exec('/usr/bin/sudo /bin/systemctl stop upmpdcli.service', function (error, stdout, stderr) {
    if (error) {
      self.logger.error('Cannot kill upmpdcli ' + error);
      defer.reject('');
    } else {
      self.server.close(function () {
        self.server.unref();
        defer.resolve('');
      });
    }
  });

  return defer.promise;
};

UpnpInterface.prototype.onRestart = function () {
  var self = this;

  exec('/usr/bin/sudo /usr/bin/killall upmpdcli', function (error, stdout, stderr) {
    if (error) {
      self.logger.error('Cannot kill upmpdcli ' + error);
    } self.startUpmpdcli();
  });
};

UpnpInterface.prototype.onInstall = function () {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.onUninstall = function () {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.getUIConfig = function () {
  var self = this;
};

UpnpInterface.prototype.setUIConfig = function (data) {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.getConf = function (varName) {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.setConf = function (varName, varValue) {
  var self = this;
  // Perform your installation tasks here
};

// Optional functions exposed for making development easier and more clear
UpnpInterface.prototype.getSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.setSystemConf = function (pluginName, varName) {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.getAdditionalConf = function () {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.setAdditionalConf = function () {
  var self = this;
  // Perform your installation tasks here
};

UpnpInterface.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

UpnpInterface.prototype.startUpmpdcli = function () {
  var self = this;

  setTimeout(function () {
    var systemController = self.commandRouter.pluginManager.getPlugin('system_controller', 'system');
    var nameraw = systemController.getConf('playerName');
    var name = nameraw.charAt(0).toUpperCase() + nameraw.slice(1);

    var upmpdcliconf = '/tmp/upmpdcli.conf';
    var upmpdcliconftmpl = __dirname + '/upmpdcli.conf.tmpl';
    var namestring = 'friendlyname = ' + name.replace(/-/g, ' ') + os.EOL + 'ohproductroom = ' + name.replace(/-/g, ' ') + os.EOL;
    var ipaddress = self.getCurrentIP();
    ipaddress.then(function (ipaddresspromise) {
      fs.readFile(__dirname + '/presentation.html.tmpl', 'utf8', function (err, data) {
        if (err) {
          return self.logger.log('Error writing Upnp presentation file: ' + err);
        }
        var conf1 = data.replace('{IP-ADDRESS}', ipaddresspromise);

        fs.writeFile('/tmp/presentation.html', conf1, 'utf8', function (err) {
          if (err) {
            self.logger.log('Error writing Upnp presentation file: ' + err);
          }
        });
      });
    });

    fs.outputFile(upmpdcliconf, namestring, function (err) {
      if (err) {
        self.logger.error('Cannot write upnp conf file: ' + err);
      } else {
        fs.appendFile(upmpdcliconf, fs.readFileSync(upmpdcliconftmpl), function (err) {
          if (err) {
            self.logger.error('Cannot write upnp conf file: ' + err);
          }
          upmpdcliexec();
        });
      }
    });

    function upmpdcliexec () {
      exec('/usr/bin/sudo /bin/systemctl start upmpdcli.service', function (error, stdout, stderr) {
        if (error) {
          self.logger.error('Cannot start Upmpdcli: ' + error);
        } else {
          self.logger.info('Upmpdcli Daemon Started');
        }
      });
    }
  }, 10000);
};

UpnpInterface.prototype.prepareUpnpPlayback = function () {
  var self = this;

  self.logger.info('Preparing playback through UPNP');

  // self.commandRouter.volumioStop();
  if (self.commandRouter.stateMachine.isVolatile) {
    self.commandRouter.stateMachine.unSetVolatile();
  }
  if (this.commandRouter.stateMachine.isConsume) {
    self.logger.info('Consume mode');
  }
  var state = self.commandRouter.volumioGetState();
  if (state !== undefined && state.service !== 'mpd') {
    self.commandRouter.volumioStop();
  }

  this.commandRouter.stateMachine.setConsumeUpdateService('mpd', false, true);
};

UpnpInterface.prototype.startUpnpPlayback = function () {
  var self = this;

  self.logger.info('Starting playback through UPNP');

  // self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
};

UpnpInterface.prototype.stopUpnpPlayback = function () {
  var self = this;

  self.logger.info('Stopping playback through UPNP');
  if (this.commandRouter.stateMachine.isConsume) {
    self.logger.info('Stopping service currently in playback since Volumio is in Consume mode');
    self.commandRouter.volumioStop();
  }
  this.commandRouter.stateMachine.setConsumeUpdateService(undefined);
};

UpnpInterface.prototype.clearQueue = function () {
  var self = this;

  self.logger.info('Clearing queue after UPNP request');
  if (self.commandRouter.stateMachine.isVolatile) {
    self.commandRouter.stateMachine.unSetVolatile();
  }

  setTimeout(() => {
    this.commandRouter.stateMachine.clearQueue();
  }, 300);
};

function parseKeyValueMessage (msg) {
  var result = {};

  msg.split('\n').forEach(function (p) {
    if (p.length === 0) {
      return result;
    }
    if (p.startsWith('OK')) {  // ignore this line and return result so far as this should be the last line of response
       return result;
    }
    if (p.startsWith('ACK')) {  // error 
        result['error'] = p;
       return result;
    }
    var keyValue = p.match(/([^ ]+): (.*)/);
    if (keyValue == null) {
      throw new Error('Could not parse entry "' + p + '"');
    }
    result[keyValue[1]] = keyValue[2];
  });
  return result;
};
