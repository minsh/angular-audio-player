(function(window, angular, undefined) {
  'use strict';
  angular.module('ngAudioPlayer', ['ng']).
  factory('$player', ['$browser', '$window', 'playerConfig', function($browser, $window, playerConfig) {
   var useFlash = (function () {
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
      return wrapper;
    }, _injectFlash = function (audio) {
      var player      = audio.config.flashPlayer,
          flashSource = player.replace(/\$1/g, 'angular-audio-player');
      flashSource = flashSource.replace(/\$2/g, audio.settings.swfLocation);
      // `(+new Date)` ensures the swf is not pulled out of cache. The fixes an issue with Firefox running multiple players on the same page.
      flashSource = flashSource.replace(/\$3/g, (+new Date + Math.random()));
      // Inject the player markup using a more verbose `innerHTML` insertion technique that works with IE.
      audio.element.replaceWith(flashSource);
      audio.element = function() {
        return angular.element(document.querySelector('#angular-audio-player'));
      }();
    }, _attachFlashEvents = function () {
      
    }, _flashError = function (audio) {
      var player       = audio.config.createPlayer,
          errorMessage = document.getElementsByClassName(player.errorMessageClass),
          html         = 'Missing <a href="http://get.adobe.com/flashplayer/">flash player</a> plugin.';
      if (audio.mp3) html += ' <a href="'+audio.mp3+'">Download audio file</a>.';
      audio.wrapper.toggleClass(player.errorClass);
      errorMessage.innerHTML = html;
    }, _attachEvents = function (wrapper, audio) {
      if (useFlash) return;
      if (!audio.config.createPlayer) return;
      var player    = audio.config.createPlayer,
          audioSrc  = angular.element(document.querySelector(_id)),
          playPause = angular.element(document.querySelector('.'+player.playPauseClass)),
          nextInst  = angular.element(document.querySelector('.'+player.nextInstClass)),
          prevInst  = angular.element(document.querySelector('.'+player.prevInstClass)),
          scrubber  = angular.element(document.querySelector('.'+player.scrubberClass)),
          leftPos   = function (elem) {
            var curleft = 0; 
            if (elem.offsetParent) {
              do { curleft += elem.offsetLeft; } while (elem = elem.offsetParent);
            }
            return curleft;
          }, percent = null;
      playPause.bind('click', function (e) {
        audio.playPause();
      });
      nextInst.bind('click', function (e) {
        audio.skipTo(percent, 'n');
      });
      prevInst.bind('click', function (e) {
        audio.skipTo(percent, 'p');
      }); 
      _trackLoadProgress(audio);
    }, _skipTo = function (audio, percent) {
      if (percent > audio.loadedPercent) return;
      audio.element[0].currentTime = audio.duration * percent;
      audio.updatePlayhead();
    }, _trackLoadProgress = function(audio) {
      if (!audio.settings.preload) return;

      var readyTimer,
          loadTimer,
          audio = audio,
          ios = (/(ipod|iphone|ipad)/i).test($window.navigator.userAgent);
      // Use timers here rather than the official `progress` event, as Chrome has issues calling `progress` when loading mp3 files from cache.
      readyTimer = setInterval(function() {
        if (audio.element[0].readyState > -1) {
          // iOS doesn't start preloading the mp3 until the user interacts manually, so this stops the loader being displayed prematurely.
          if (!ios) audio.init(audio);
        }
        if (audio.element[0].readyState > 1) {
          if (audio.settings.autoplay) audio.play(audio);
          clearInterval(readyTimer);
          // Once we have data, start tracking the load progress.
          loadTimer = setInterval(function() {
            audio.loadProgress();
            if (audio.loadedPercent >= 1) clearInterval(loadTimer);
          });
        }
      }, 10);
      audio.readyTimer = readyTimer;
      audio.loadTimer = loadTimer;
    }, _updatePlayhead = function(audio, arr) {
      var player   = audio.config.createPlayer,
          playProg = angular.element(document.querySelector('.'+player.progressClass)),
          scrubber = angular.element(document.querySelector('.'+player.scrubberClass)),
          playTime = angular.element(document.querySelector('.'+player.playedClass)),
          p        = audio.duration * arr[0],
          m        = Math.floor(p / 60),
          s        = Math.floor(p % 60);
      playTime.html((m<10?'0':'')+m+':'+(s<10?'0':'')+s);
      playProg.css('width', scrubber[0].offsetWidth*arr[0]+'px'); 
    }, _audio = function (element, s) { 
      this.element = element;
      this.wrapper = element.parent();
      this.source = element.children('<source>') || element;
      this.settings = s.settings;
      this.config = s;
      //not working.
      this.mp3 = (function(element) {
        var source = element.children('<source>')[0];
        return element.attr('src') || (source ? source.attr('src') : null);
      })(element);
      this.index = 0;
      this.loadStartedCalled = false;
      this.loadedPercent = 0;
      this.duration = 1;
      this.playing = false;

      _audio.prototype.updatePlayhead = function() {
        var percent = this.element[0].currentTime / this.duration;
        _updatePlayhead(this, [percent]);
      };
      _audio.prototype.skipTo = function(percent, inst) {
        if (percent) {
          percent = percent;
        } else {
          var arr   = this.settings.tags[_tag],
              index = this.index,
              point = arr[index]/1000;
          if (inst === 'n') { this.index++; }
          if (inst === 'p') { this.index--; }
          percent = point/this.duration;
        }
        _skipTo(this, percent);
      };
      _audio.prototype.load = function() {
        this.loadStartedCalled = false;
        // The now outdated `load()` method is required for Safari 4
        this.element[0].load();
        _trackLoadProgress(this);
      };
      _audio.prototype.loadError = function() {
        _loadError(this);
      };
      _audio.prototype.init = function() {
        _init(this);
      };
      _audio.prototype.loadStarted = function() {
        // Wait until `element.duration` exists before setting up the audio player.
        if (!this.element[0].duration) return false;
        this.duration = this.element[0].duration;
        this.updatePlayhead();
        this.loadStartedCalled = true;
        _loadStarted(this);
      };
      _audio.prototype.loadProgress = function() {
        if (this.element[0].buffered != null && this.element[0].buffered.length) {
          // Ensure `loadStarted()` is only called once.
          if (!this.loadStartedCalled) {
            this.loadStartedCalled = this.loadStarted();
          }
          var durationLoaded = this.element[0].buffered.end(this.element[0].buffered.length - 1);
          this.loadedPercent = durationLoaded / this.duration;
          _loadProgress(this, [this.loadedPercent]);
        }
      };
      _audio.prototype.playPause = function() {
        if (this.playing) this.pause();
        else this.play();
      };
      _audio.prototype.play = function() {
        var ios = (/(ipod|iphone|ipad)/i).test($window.navigator.userAgent);
        // On iOS this interaction will trigger loading the mp3, so run `init()`.
        if (ios && this.element[0].readyState == 0) this.init(this);
        // If the audio hasn't started preloading, then start it now.  
        // Then set `preload` to `true`, so that any tracks loaded in subsequently are loaded straight away.
        if (!this.settings.preload) {
          this.settings.preload = true;
          this.element[0].attr('preload', 'auto');
          _trackLoadProgress(this);
        }
        this.playing = true;
        this.element[0].play();
        _play(this);
      };
      _audio.prototype.pause = function() {
        this.playing = false;
        this.element[0].pause();
        _pause(this);
      };
      _audio.prototype.setVolume = function(v) {
        this.element[0].volume = v;
      };
      _audio.prototype.trackEnded = function(e) {
        this.skipTo(this, [0]);
        if (!this.settings.loop) this.pause(this);
        _trackEnded(this);
      };
    }, _trackEnd = function (e) {
    }, _loadError = function (audio) {

    }, _newPlayer = function(element, options) {
      var s = playerConfig;
      if (element.attr('autoplay') != null) s.settings.autoplay = true;
      if (element.attr('loop') != null) s.settings.loop = true;
      if (element.attr('preload') == 'none') s.settings.preload = false;
      if (options) {
        angular.forEach(options, function(v, k) {
          s.settings[k] = v;
        });
      }
      if (s.createPlayer.markup) element = _createPlayer(element, s.createPlayer);
      //include else case too
      var audio = new _audio(element, s);

      if (useFlash && hasFlash) {
        _injectFlash(audio);
        _attachFlashEvents(audio.wrapper);
      } else if (useFlash && !hasFlash) {
        _flashError(audio);
      }
      if (!useFlash || (useFlash && hasFlash)) _attachEvents(audio.wrapper, audio);
      return audio;
    }, _init = function (audio) {
      var player = audio.config.createPlayer;
      audio.wrapper.addClass(player.loadingClass);
    }, _loadStarted = function (audio) {
      var player   = audio.config.createPlayer,
          duration = angular.element(document.querySelector('.'+player.durationClass)),
          m        = Math.floor(audio.duration / 60),
          s        = Math.floor(audio.duration % 60);
      audio.wrapper.removeClass(player.loadingClass);
      duration.html(((m<10?'0':'')+m+':'+(s<10?'0':'')+s)); 
    }, _loadProgress = function (audio, arr) {
      var player   = audio.config.createPlayer,
          scrubber = angular.element(document.querySelector('.'+player.scrubberClass)),
          loaded   = angular.element(document.querySelector('.'+player.loaderClass));
      loaded.css('width', scrubber[0].offsetWidth*arr[0]+'px');
    }, _playPause = function () {
    }, _pause = function (audio) {
      var player = audio.config.createPlayer;
      audio.wrapper.removeClass(player.playingClass);
    }, _play = function (audio) {
      var player = audio.config.createPlayer;
      audio.wrapper.addClass(player.playingClass);
    }, _setTags = function(audio) { 
      var arr       = audio.settings.tags[_tag],
          player    = audio.config.createPlayer,
          tagHolder = angular.element(document.querySelector('.'+player.tagClass));
      tagHolder.children().remove();
      for (var i = 0; i < arr.length; i++) {
        var place = (arr[i]/(audio.duration*1000))*280;
        console.log(audio.duration, place, (arr[i]/(audio.duration*1000)));
        tagHolder.append('<div class="tag" style="left:'+place+'px;"></div>');
      }
    }, _id = null, _tag = null;

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
            _id = id;
        return _newPlayer(element, options);
      },
      setTag : function (tag, audio) {
        _tag = tag;
        var interval = setInterval(function() {  
          if (audio.duration > 1) {
            _setTags(audio);
            clearInterval(interval);
          }
        }, 10);
      },
      trackEnd : function () {
      
      },
      setVolume : function () {
        
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
            <div class="tags"></div> \
          </div> \
          <div class="nextBack"> \
            <div class="prevInst"></div> \
            <div class="nextInst"></div> \
          </div> \
          <div class="time"> \
            <em class="played">00:00</em>/<strong class="duration">00:00</strong> \
          </div> \
          <div class="error-message"></div>',
        playPauseClass: 'play-pause',
        nextBackClass: 'nextBack',
        nextInstClass: 'nextInst',
        prevInstClass: 'prevInst',
        scrubberClass: 'scrubber',
        progressClass: 'progress',
        loaderClass: 'loaded',
        timeClass: 'time',
        durationClass: 'duration',
        playedClass: 'played',
        errorMessageClass: 'error-message',
        playingClass: 'playing',
        loadingClass: 'loading',
        tagClass: 'tags',
        errorClass: 'error'
      },
      settings : {
        autoplay: false,
        loop: false,
        preload: true,
        imageLocation: _path + 'player-graphics.gif',
        swfLocation: _path + 'angular-audio.swf'
      }
    };
  }])
})(window, window.angular);
