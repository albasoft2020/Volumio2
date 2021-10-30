'use strict';

// Helper for interface-mpd.
// Contains tools to print commands in MPD format.
// Contains setters to set data in MPD format.

var libQ = require('kew');

const command = { // List of all MPD commands
  ADD: 'add',
  ADDID: 'addid',
  ADDTAGID: 'addtagid',
  CHANNELS: 'channels',
  CLEAR: 'clear',
  CLEARERROR: 'clearerror',
  CLEARTAGID: 'cleartagid',
  CLOSE: 'close',
  COMMANDS: 'commands',
  CONFIG: 'config',
  CONSUME: 'consume',
  COUNT: 'count',
  CROSSFADE: 'crossfade',
  CURRENTSONG: 'currentsong',
  DECODERS: 'decoders',
  DELETE: 'delete',
  DELETEID: 'deleteid',
  DISABLEOUTPUT: 'disableoutput',
  ENABLEOUTPUT: 'enableoutput',
  FIND: 'find',
  FINDADD: 'findadd',
  IDLE: 'idle',
  KILL: 'kill',
  LIST: 'list',
  LISTALL: 'listall',
  LISTALLINFO: 'listallinfo',
  LISTFILES: 'listfiles',
  LISTMOUNTS: 'listmounts',
  LISTPLAYLIST: 'listplaylist',
  LISTPLAYLISTINFO: 'listplaylistinfo',
  LISTPLAYLISTS: 'listplaylists',
  LOAD: 'load',
  LSINFO: 'lsinfo',
  MIXRAMPDB: 'mixrampdb',
  MIXRAMPDELAY: 'mixrampdelay',
  MOUNT: 'mount',
  MOVE: 'move',
  MOVEID: 'moveid',
  NEXT: 'next',
  NOIDLE: 'noidle',
  NOTCOMMANDS: 'notcommands',
  OUTPUTS: 'outputs',
  PASSWORD: 'password',
  PAUSE: 'pause',
  PING: 'ping',
  PLAY: 'play',
  PLAYID: 'playid',
  PLAYLIST: 'playlist',
  PLAYLISTADD: 'playlistadd',
  PLAYLISTCLEAR: 'playlistclear',
  PLAYLISTDELETE: 'playlistdelete',
  PLAYLISTFIND: 'playlistfind',
  PLAYLISTID: 'playlistid',
  PLAYLISTINFO: 'playlistinfo',
  PLAYLISTMOVE: 'playlistmove',
  PLAYLISTSEARCH: 'playlistsearch',
  PLCHANGES: 'plchanges',
  PLCHANGEPOSID: 'plchangesposid',
  PREVIOUS: 'previous',
  PRIO: 'prio',
  PRIOID: 'prioid',
  RANDOM: 'random',
  RANGEID: 'rangeid',
  READCOMMENTS: 'readcomments',
  READMESSAGES: 'readmessages',
  RENAME: 'rename',
  REPEAT: 'repeat',
  REPLAY_GAIN_MODE: 'replay_gain_mode',
  REPLAY_GAIN_STATUS: 'replay_gain_status',
  RESCAN: 'rescan',
  REMOVE: 'rm',
  SAVE: 'save',
  SEARCH: 'search',
  SEARCHADD: 'searchadd',
  SEARCHADDPL: 'searchaddpl',
  SEEK: 'seek',
  SEEKCUR: 'seekcur',
  SEEKID: 'seekid',
  SENDMESSAGE: 'sendmessage',
  SETVOL: 'setvol',
  SHUFFLE: 'shuffle',
  SINGLE: 'single',
  STATS: 'stats',
  STATUS: 'status',
  STICKER: 'sticker',
  STOP: 'stop',
  SUBSCRIBE: 'subscribe',
  SWAP: 'swap',
  SWAPID: 'swapid',
  TAGTYPES: 'tagtypes',
  TOGGLEOUTPUT: 'toggleoutput',
  UNMOUNT: 'unmount',
  UNSUBSCRIBE: 'unsubscribe',
  UPDATE: 'update',
  URLHANDLERS: 'urlhandlers',
  VOLUME: 'volume'
};

const tagtypes = { // List of all MPD tagtypes
  ARTIST: 'Artist',
  ARTISTSORT: 'ArtistSort',
  ALBUM: 'Album',
  ALBUMARTIST: 'AlbumArtist',
  ALBUMTITLE: 'AlbumTitle',
  TITLE: 'Title',
  TRACK: 'Track',
  NAME: 'Name',
  GENRE: 'Genre',
  DATE: 'Date',
  PERFORMER: 'Performer',
  DISC: 'Disc',
  MUSICBRAINZ_ARTISTID: 'MUSICBRAINZ_ARTISTID',
  MUSICBRAINZ_ALBUMID: 'MUSICBRAINZ_ALBUMID',
  MUSICBRAINZ_ALBUMARTISTID: 'MUSICBRAINZ_ALBUMARTISTID',
  MUSICBRAINZ_TRACKID: 'MUSICBRAINZ_TRACKID',
  MUSICBRAINZ_RELEASETRACKID: 'MUSICBRAINZ_RELEASETRACKID'
};
// Not supported until MPD 0.21
// MUSICBRAINZ_WORKID: 'MUSICBRAINZ_WORKID'

var stats = { // DUMMY FOR NOW!
  uptime: 0,
  playtime: 0,
  artists: 0,
  albums: 0,
  songs: 0,
  db_playtime: 0,
  db_update: 0
};

var status = { // default format, fill with real data
  volume: 100,
  repeat: 0,
  random: 0,
  single: 0,
  consume: 0,
  playlist: 0,
  playlistlength: 1,
  mixrampdb: 0.0,
  state: 'pause',
  song: 0,
  songid: 0,
  time: '0:0',
  elapsed: 0.000,
  duration: 0,
  bitrate: 0,
  audio: '00000:00:0',
  nextsong: 0,
  nextsongid: 0
};

var playlistFile = { // TODO needs more attributes
  'file': '',
  'Last-Modified': '',
  'Date': 0,
  'Time': 0,
  'Pos': 0,
  'Id': 0
};

var playlistId = { // DUMMY FOR NOW!
  'file': 'USB/Music/Example1.mp3',
  'Last-Modified': '2013-07-02T17:51:12Z',
  'Date': 2013,
  'Time': 3261,
  'Pos': 0,
  'Id': 9
};

var currentSong = {
    "file":"",
    "Artist":"",
    "Title":"",
    "Pos":"4",
    "Id":"26"
};

var ID = -1;

var songStartTime = 0;

var queue = []; // hold playlistFiles (given by commandRouter)

// ======================= START OF MODULE EXPORT
module.exports = {
// ======================= Tools (called from outside)

  // Give MPD output of Commands (command.COMMANDS)
  printCommandList: function () {
    var output = '';
    // for the length of command (nr of commands)
    for (var index in command) {
      // print command: 'command' [newline]
      output += 'command: ' + command[index] + '\n';
    }
    return output;
  },

  // Give MPD output of library (listall)
  printLibrary: function (library) {
    var output = '';
    // For each item
    library.forEach(function (item) {
      // print: file: '[service] title'
      output += 'file: \'[' + item.service + '] ' + item.metadata.title + '"';
      output += '\n';
    });
    return output;
  },

  // Give MPD output of tagtypes
  printTagTypes: function () {
    var output = '';
    for (var index in tagtypes) {
      // print tagtype: 'tagtype' [newline]
      output += 'tagtype: ' + tagtypes[index] + '\n';
    }
    return output;
  },

  // Give MPD output of queue
  printPlaylist: function (pos) {
    var output = '';
    if (pos) { 
        if (pos < status.playlistlength) {
            output += printArray(queue[pos]);
        }
    } else {
        queue.forEach(function (track) {
          output += printArray(track);
        });
    }
    return output;
  },

  // Give MPD output of status
  printStatus: function (state) {
    if (state) {
      this.setStatus(state);
    }

    return printArray(status);
  },
  
  // Print mpd output of status with correct elapsed time
    printStatusElapsed: function () {
        if (status.state === 'play') {// playing, so update elapsed time
            let elapsed = (Date.now() - songStartTime)/1000;
            status.elapsed = elapsed; // time elapsed
            status.time = Math.round(elapsed) + ':' + status.duration; // song time
        }
    return printArray(status);
  },

  // Give MPD output of stats
  printStats: function () {
    return printArray(stats);
  },
  
   // Give MPD output of status
  printSong: function (vState) {
    if (vState) {
      this.setSong(vState);
    }

    return printArray(currentSong);
  },
  // END OF TOOLS

  // ======================== SETTERS (called from outside)

  // Set the Status
  setStatus: function (vState) {
    // copy values
    status.state = vState.status;	// playstate
    status.song = vState.position; // song nr in playlist
    // vState.dynamictitle unhandled
    status.elapsed = vState.seek/1000; // time elapsed
    status.time = Math.round(status.elapsed) + ':' + vState.duration; // song time
    status.duration = vState.duration;
    let sr = '', bd = '';
    if (vState.samplerate) sr = vState.samplerate.split(" ")[0]*1000;  //sample rate in Hz
    if (vState.bitdepth) bd = vState.bitdepth.split(" ")[0];
    status.audio = sr + ':' + bd + ':' + vState.channels; // (44000:24:2) default
    // vState.service unhandled

    // Return a resolved empty promise to represent completion
    return libQ.resolve();
  },
  
    // Set the Status by copying status and possibly adjusting for offset and updating duraton
  copyStatus: function (mpdState, offset, duration) {
    // copy the whole state object (assumed to come straight from mpd!)
    status = Object.assign({}, mpdState);
    if (offset || duration){
        if (offset) status.elapsed = Math.round((status.elapsed-offset)*1000)/1000;
        let nDur = 0;
        if (duration) {
            status.duration = duration;
            nDur = Math.round(duration);
        } else {
            if (status.time) nDur = status.time.split(':')[1];
        }
        status.time = Math.round(status.elapsed) + ':' + nDur;
    }
    // Return a resolved empty promise to represent completion
    return libQ.resolve();
  },
  
  // Set the Song from Volumio state
  setSong: function (vState) {
      let isNewSong = false;
    // copy values
    if (vState.uri) currentSong.file = vState.uri;
    if ((vState.artist !== null) && (currentSong.Artist !== vState.artist)) { 
        currentSong.Artist = vState.artist;
        isNewSong = true;
    }
    if ((vState.title !== null) && (currentSong.Title !== vState.title)) {
        currentSong.Title = vState.title;
        isNewSong = true;
    }
    if (vState.position !== null) currentSong.Pos = vState.position;
    if (vState.album !== null) currentSong.Album = vState.album;
    //
    songStartTime = Date.now();
    // Return a resolved empty promise to represent completion
    return libQ.resolve(isNewSong);
  },
  
    // Set the current song by copying mpd song
  copySong: function (mpdSong) {
    // copy values
    currentSong = Object.assign({}, mpdSong);

    // Return a resolved empty promise to represent completion
    return libQ.resolve();
  },
  
  assignSongId: function () {
      ID++;
      currentSong.Id = ID;
      status.songid = ID;
      // should also set this in the queue
      return ID;
  },
  
  // Set the queue
  setQueue: function (newQueue) {
    queue = [];
    var positionNr = 0;
    newQueue.forEach(function (track) {
      var t = {
        file: track.uri || '',
        Pos: positionNr
//        service: track.service,
//        trackid: track.trackid,
//        metadata: {
//          title: track.name
//        }
      };
      // Copy (some of the) other keys that would be used by mpd, ingoring the rest
      if (track.title) {
          t.Title = track.title;
      } else if (track.name) {
          t.Title = track.name;
      }
      if (track.name) { t.Name = track.name; }
      if (track.artist) { t.Artist = track.artist; }
      if (track.album) { t.Album = track.album; }
      
      positionNr++;
      queue.push(t);
    });

    status.playlistlength = positionNr;

    // Return a resolved empty promise to represent completion
    return libQ.resolve();
  }

// END OF SETTERS
};
//	END OF MODULE.EXPORT

// ======================== INTERNAL FUNCTIONS (called from this file)
// print array with 'key: value' output
function printArray (array) {
  var output = '';
  // for the length of array (nr of fields)
  for (var index in array) {
    // print status: 'status' [newline]
    output += index + ': ' + array[index] + '\n';
  }
  return output;
}

function logDone () {
  console.log('------------------------------');
  return libQ.resolve();
}

function logStart (sCommand) {
  console.log('\n---------------------------- ' + sCommand);
  return libQ.resolve();
}
// END OF INTERNAL FUNCTIONS
