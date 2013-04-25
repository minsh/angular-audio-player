(function(window, angular, undefined) {
  'use strict';
  angular.module('ngAudioPlayer', ['ng']).
  factory('$player', ['$browser', '$window', 'playerConfig', function($browser, $window, playerConfig) {
   var useFlash = (function (){
      var a = document.createElement('audio');
      return !(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
    })(), hasFlash = false,
    _createPlayer = function (element, player) {
      var newElem = element.clone(true),
          wrapper = element.after('<div>');
      wrapper.next().addClass('angular-player');
      wrapper.next().attr('className', 'angular-player');
      wrapper.next().attr('id', 'angularPlayer');
      //TODO: check if works on ie
      wrapper.next().append(newElem);
      wrapper.next().append(player.markup);
      wrapper.remove();
      wrapper = angular.element(document.querySelector(_id));
      console.log(wrapper);
      return wrapper;
    }, _injectFlash = function () {
    
    }, _attachFlashEvents = function () {
    
    }, _flashError = function () {
    
    }, _attachEvents = function (wrapper, audio) {
      if (!audio.config.createPlayer) return;
      var player    = audio.config.createPlayer,
          playPause = wrapper.children(document.querySelectorAll(player.playPauseClass)),
          scrubber  = wrapper.children(document.querySelectorAll(player.scrubberClass)),
          leftPos   = function (elem) {
            var curleft = 0; 
            if (elem.offsetParent) {
              do { curleft += elem.offsetLeft; } while (elem = elem.offsetParent);
            }
            return curleft;
          };
      console.log(playPause);
      playPause.bind('click', function (e) {
        playPause[0].play();
      });
    }, _audio = function (element, s) { 
      this.element = element;
      this.wrapper = element.parent();
      this.source = element.children('<source>') || element;
      this.settings = s.settings;
      this.config = s;
      this.loadStarted = false;
      this.duration = 1;
      this.playing = false;
    }, _trackEnd = function (e) {
    }, _loadError = function () {
    }, _newPlayer = function(element, options) {
      var s = playerConfig;
      if (element.attr('autoplay') != null) s.settings.autoplay = true;
      if (element.attr('loop') != null) s.settings.loop = true;
      if (element.attr('preload') == 'none') s.settings.preload = false;
      if (options)
        angular.forEach(options, function(v, k) {
          s.settings[k] = v;
        });
      if (s.createPlayer.markup) element = _createPlayer(element, s.createPlayer);
      //include else case too
      var audio = new _audio(element, s);
 
      if (useFlash && hasFlash) {
        _injectFlash(audio);
        _attachFlashEvents(audio.wrapper);
      } else if (useFlash && !hasFlash) {
        _flashError();
      }
      if (!useFlash || (useFlash && hasFlash)) _attachEvents(audio.wrapper, audio);
      return audio;
    }, _init = function () {
    
    }, _loadStarted = function () {

    }, _loadProgress = function () {
    
    }, _playPause = function () {
    }, _play = function (audio) { 
      var ios = (/(ipod|iphone|ipad)/i).test($window.navigator.userAgent);
      // On iOS this interaction will trigger loading the mp3, so run `init()`.
      if (ios && audio.element.readyState == 0) audio.init.apply(this);
      // If the audio hasn't started preloading, then start it now.  
      // Then set `preload` to `true`, so that any tracks loaded in subsequently are loaded straight away.
      if (!audio.settings.preload) {
        audio.settings.preload = true;
        audio.element.attr('preload', 'auto');
        //container[audiojs].events.trackLoadProgress(this);
      }
      audio.playing = true;
      audio.element.play();
      console.log(audio.element);
    }, _updatePlayerHead = function (percent) {
    }, _id = null;

    if(useFlash) {
      hasFlash = (function() {
        if ($window.navigator.plugins && $window.navigator.plugins.length && $window.navigator.plugins['Shockwave Flash']) {
          return true;
        } else if ($window.navigator.mimeTypes && $window.navigator.mimeTypes.length) {
          var mimeType = $window.navigator.mimeTypes['application/x-shockwave-flash'];
          return mimeType && mimeType.enabledPlugin;
        } else {
          try {
            var ax = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
            return true;
          } catch (e) {}
        }
        return false;
      })();
    }

    return {
      create : function(id, options) {
        var query   = document.querySelector(id),
            element = angular.element(query),
            options = options || null;
            console.log(element);
            _id = id;
        return _newPlayer(element, options);
      },
      play : function () {
      
      },
      playPause : function () {
      
      },
      pause : function () {
      
      },
      trackEnd : function () {
      
      },
      setVolume : function () {
        
      },
      loadProgress : function () {
      
      },
      loadStarted : function () {
      
      },
      init : function () {
      
      },
      loadError : function () {
      
      },
      load : function () {
      
      },
      skipTo : function () {
      
      },
      updatePlayHead : function () {
      
      }
    };
  }]).
  factory('playerConfig', [function() {
    var _path = (function() {
      var re      = new RegExp('angular-audio-player(\.min)?\.js.*'),
          query   = document.querySelectorAll('script'),
          scripts = angular.element(query);
      for (var i = 0, ii = scripts.length; i < ii; i++) {
        var path = scripts[i].getAttribute('src'); 
        if(re.test(path)) return path.replace(re, '');
      }
    })();
    return { 
      flashPlayer : '\
        <object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" id="$1" width="1" height="1" name="$1" style="position: absolute; left: -1px;"> \
          <param name="movie" value="$2?playerInstance=ngplayer.instances[\'$1\']&datetime=$3"> \
          <param name="allowscriptaccess" value="always"> \
          <embed name="$1" src="$2?playerInstance=ngplayer.instances[\'$1\']&datetime=$3" width="1" height="1" allowscriptaccess="always"> \
        </object>',
      createPlayer: {
        markup: '\
          <div class="play-pause"> \
            <p class="play"></p> \
            <p class="pause"></p> \
            <p class="loading"></p> \
            <p class="error"></p> \
          </div> \
          <div class="scrubber"> \
            <div class="progress"></div> \
            <div class="loaded"></div> \
          </div> \
          <div class="time"> \
            <em class="played">00:00</em>/<strong class="duration">00:00</strong> \
          </div> \
          <div class="error-message"></div>',
        playPauseClass: 'play-pause',
        scrubberClass: 'scrubber',
        progressClass: 'progress',
        loaderClass: 'loaded',
        timeClass: 'time',
        durationClass: 'duration',
        playedClass: 'played',
        errorMessageClass: 'error-message',
        playingClass: 'playing',
        loadingClass: 'loading',
        errorClass: 'error'
      },
      settings : {
        autoplay: false,
        loop: false,
        preload: true,
        imageLocation: _path + 'player-graphics.gif',
        swfLocation: _path + 'audiojs.swf'
      }
    };
  }])
})(window, window.angular);
