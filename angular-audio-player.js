(function(window, angular, undefined) {
  'use strict';
  angular.module('ngAudioPlayer', ['ng']).
  factory('$player', ['$window', 'playerConfig', function($window, playerConfig) {
    var _q = function (selector) {
      if (typeof jQuery != 'undefined') {
        return selector;
      } else if (document.querySelector) {
        return document.querySelectorAll(selector);
      } else {
        //TODO Make a selector function for cases when both jquery and querySelector are not their.
      }
    }, _path = (function () {
      var re      = new RegExp('angular-audio-player(\.min)?\.js.*'),
          scripts = angular.element(_q('script'));
      for (var i = 0, ii = scripts.length; i < ii; i++) {
        var path = scripts[i].getAttribute('src'); 
        if(re.test(path)) return path.replace(re, '');
      }
    })(), _settings = function () {
      return {
        autoplay: false,
        loop: false,
        preload: true,
        swfLocation: _path + 'angular-audio.swf'
      };
    }, _useFlash = (function () {
      var a = document.createElement('audio');
      return !(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''));
    })(), _hasFlash = (function () {
      if(_useFlash) {
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
      } else {
        return false;
      }
    })(), _createPlayer = function (element, player) {
      var newElem = element.clone(true),
          wrapper = element.after('<div>');
      wrapper.next().addClass('angular-player');
      wrapper.next().attr('className', 'angular-player');
      wrapper.next().attr('id', 'angularPlayer');
      //TODO check if works on ie
      newElem.attr('src', _url);
      wrapper.next().append(newElem);
      wrapper.next().append(player.markup);
      wrapper.remove();
      wrapper = angular.element(_q(_id));
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
        return angular.element(_q('embed'));
      }();
    }, _attachFlashEvents = function (wrapper, audio) {
      audio['swfReady'] = false;
      audio['load'] = function() {
        // If the swf isn't ready yet then just set `audio.mp3`. `init()` will load it in once the swf is ready.
        if (audio.swfReady) audio.element[0].load(audio.mp3);
      };
      audio['loadProgress'] = function(percent, duration) {
        audio.loadedPercent = percent;
        audio.duration = duration;
        _loadStarted(audio);
        _loadProgress(audio, [percent]);
      };
      audio['skipTo'] = function(percent, inst) {
        var player    = this.config.createPlayer,
            nextInst  = angular.element(_q('.'+player.nextInstClass)),
            prevInst  = angular.element(_q('.'+player.prevInstClass));
        if (percent && !inst) {
          percent = percent;
        } else {
          var arr = this.settings.tags[_tag],
              ele = this.element[0].currentTime,
              arr = arr.sort(function(a,b){return a-b});
          if (inst === 'n') { if (this.index < arr.length && this.index !== arr.length-1) this.index++; }
          if (inst === 'p') { if (this.index > 0) this.index--; }
          var index = this.index,
              point = arr[index]/1000;
          percent = point/this.duration;
          if (this.index === 0) prevInst.addClass('audio-none');
          else prevInst.removeClass('audio-none');
          if (this.index === arr.length-1) nextInst.addClass('audio-none');
          else nextInst.removeClass('audio-none');
        }
        audio.element[0].skipTo(percent);
        console.log(percent);
        audio.updatePlayhead(percent);
      };
      audio['updatePlayhead'] = function(percent) {
        _updatePlayhead(audio, [percent]);
      };
      audio['play'] = function() {
        // If the audio hasn't started preloading, then start it now.  
        // Then set `preload` to `true`, so that any tracks loaded in subsequently are loaded straight away.
        if (!audio.settings.preload) {
          audio.settings.preload = true;
          audio.element[0].init(audio.mp3);
        }
        audio.playing = true;
        // IE doesn't allow a method named `play()` to be exposed through `ExternalInterface`, so lets go with `pplay()`.  
        // <http://dev.nuclearrooster.com/2008/07/27/externalinterfaceaddcallback-can-cause-ie-js-errors-with-certain-keyworkds/>
        audio.element[0].pplay();
        _play(audio);
      };
      audio['pause'] = function() {
        audio.playing = false;
        // Use `ppause()` for consistency with `pplay()`, even though it isn't really required.
        audio.element[0].ppause();
        _pause(audio);
      };
      audio['setVolume'] = function(v) {
        audio.element[0].setVolume(v);
      };
      audio['loadStarted'] = function() {
        // Load the mp3 specified by the audio element into the swf.
        audio.swfReady = true;
        if (audio.settings.preload) audio.element[0].init(audio.mp3);
        if (audio.settings.autoplay) audio.play();
      };
    }, _flashError = function (audio) {
      var player       = audio.config.createPlayer,
          errorMessage = document.getElementsByClassName(player.errorMessageClass),
          html         = 'Missing <a href="http://get.adobe.com/flashplayer/">flash player</a> plugin.';
      if (audio.mp3) html += ' <a href="'+audio.mp3+'">Download audio file</a>.';
      audio.wrapper.toggleClass(player.errorClass);
      errorMessage.innerHTML = html;
    }, _attachEvents = function (wrapper, audio) {
      if (!audio.config.createPlayer) return;
      var player    = audio.config.createPlayer,
          audioSrc  = angular.element(_q(_id)),
          playPause = angular.element(_q('.'+player.playPauseClass)),
          nextInst  = angular.element(_q('.'+player.nextInstClass)),
          prevInst  = angular.element(_q('.'+player.prevInstClass)),
          scrubber  = angular.element(_q('.'+player.scrubberClass)),
          speaker   = angular.element(_q('.'+player.speakerClass)),
          volSlider = angular.element(_q('.'+player.speakerScrubber)),
          volClicks = angular.element(_q('.'+player.volumeClickClass)),
          volValue  = angular.element(_q('.'+player.volumeClass)),
          percent   = null,
          mousedwn  = false;
      playPause.bind('click', function (e) {
        audio.playPause();
      });
      nextInst.bind('click', function (e) {
        audio.skipTo(percent, 'n');
      });
      prevInst.bind('click', function (e) {
        audio.skipTo(percent, 'p');
      });
      volClicks.bind('mousedown', function (e) {
        mousedwn = true;
      });
      volClicks.bind('click', function (e) { 
        var val = e.offsetX ? e.offsetX : e.originalEvent.layerX; 
        volValue.css('width', val);
        audio.setVolume(val/volSlider[0].offsetWidth);
        audio.volume = val/volSlider[0].offsetWidth;
      });
      volClicks.bind('mouseup', function(e) {
        mousedwn = false;
      }); 
      volClicks.bind('mouseout', function(e) {
        mousedwn = false;
      }); 
      volClicks.bind('mousemove', function(e) {
        if (mousedwn) { 
          var val = e.offsetX ? e.offsetX : e.originalEvent.layerX; 
          volValue.css('width', val);
          audio.setVolume(val/volSlider[0].offsetWidth);
          audio.volume = val/volSlider[0].offsetWidth;
        }
      });
      audio.element.bind('ended', function (e) {
        audio.trackEnded(e);
      });
      speaker.bind('click', function (e) {
        if (audio.vol) {
          audio.setVolume(0);
          audio.vol = false;
          speaker.removeClass(player.speakerOnClass);
          speaker.addClass(player.speakerOfClass);
          volSlider.addClass('audio-none');
        } else {
          audio.setVolume(audio.volume);
          speaker.removeClass(player.speakerOfClass);
          speaker.addClass(player.speakerOnClass);
          audio.vol = true;
          volSlider.removeClass('audio-none');
        }
      });
      audio.element.bind('timeupdate', function (e) {
        audio.updatePlayhead();
      });
      scrubber.bind('click', function(e) {
        var relativeLeft = e.offsetX ? e.offsetX : e.originalEvent.layerX;
        audio.skipTo(relativeLeft / scrubber[0].offsetWidth, undefined);
      });
      if (_useFlash) return;
      _trackLoadProgress(audio);
    }, _skipTo = function (audio, percent) {
      audio.element[0].currentTime = audio.duration * percent;
      audio.updatePlayhead();
    }, _trackLoadProgress = function(audio) {
      if (!audio.settings.preload) return;

      var readyTimer,
          loadTimer,
          audio = audio,
          ios = (/(ipod|iphone|ipad)/i).test($window.navigator.userAgent);
      // Use timers here rather than the official `progress` event, as Chrome has issues calling `progress` when loading mp3 files from cache.
      readyTimer = function () {
        setTimeout( function() {
          if (audio.element[0].readyState > -1) {
            // iOS doesn't start preloading the mp3 until the user interacts manually, so this stops the loader being displayed prematurely.
            if (!ios) audio.init(audio);
          }
          if (audio.element[0].readyState > 1) {
            if (audio.settings.autoplay) audio.play(audio);
            // Once we have data, start tracking the load progress.
            loadTimer = function () {
              setTimeout( function() {
                  audio.loadProgress();
                  if (audio.loadedPercent < 1) loadTimer();
              }, 10);
            };
            loadTimer();
          } else {
            readyTimer();
          }
        }, 10);
        audio.readyTimer = readyTimer;
        audio.loadTimer = loadTimer;
      };
      readyTimer();
    }, _updatePlayhead = function(audio, arr) {
      var player   = audio.config.createPlayer,
          playProg = angular.element(_q('.'+player.progressClass)),
          scrubber = angular.element(_q('.'+player.scrubberClass)),
          playTime = angular.element(_q('.'+player.playedClass)),
          p        = audio.duration * arr[0],
          m        = Math.floor(p / 60),
          s        = Math.floor(p % 60);
      playTime.html((m<10?'0':'')+m+':'+(s<10?'0':'')+s);
      playProg.css('width', scrubber[0].offsetWidth*arr[0]+'px');
    }, _audio = function (element, s) { 
      this.element = element;
      this.wrapper = element.parent();
      //this.source = element.children('<source>') || element;
      this.settings = s.settings;
      this.config = s;
      this.vol = true;
      this.volume = 1;
      //this.mp3 = _url;
      //not working.
      this.mp3 = (function(element) {
        var source = element.children(_q('script'))[0];
        return element.attr('src') || (source ? source.attr('src') : null);
      })(element);
      this.index = -1;
      this.loadStartedCalled = false;
      this.loadedPercent = 0;
      this.duration = 1;
      this.playing = false;

      _audio.prototype.updatePlayhead = function() {
        var percent = this.element[0].currentTime / this.duration;
        _updatePlayhead(this, [percent]);
      };
      _audio.prototype.skipTo = function(percent, inst) {
        var player    = this.config.createPlayer,
            nextInst  = angular.element(_q('.'+player.nextInstClass)),
            prevInst  = angular.element(_q('.'+player.prevInstClass));
        if (percent) {
          percent = percent;
        } else {
          var arr = this.settings.tags[_tag],
              ele = this.element[0].currentTime,
              arr = arr.sort(function(a,b){return a-b});
          if (inst === 'n') { if (this.index < arr.length && this.index !== arr.length-1) this.index++; }
          if (inst === 'p') { if (this.index > 0) this.index--; }
          var index = this.index,
              point = arr[index]/1000;
          percent = point/this.duration;
          if (this.index === 0) prevInst.addClass('audio-none');
          else prevInst.removeClass('audio-none');
          if (this.index === arr.length-1) nextInst.addClass('audio-none');
          else nextInst.removeClass('audio-none');
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
        if (ios && this.element[0].readyState == 0) this.init();
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
    }, _trackEnded = function (audio) {
      var player = audio.config.createPlayer;
      audio.wrapper.removeClass(player.playingClass);
    }, _loadError = function (audio) {
    }, _newPlayer = function(element, options) {
      var s        = playerConfig,
          settings = _settings();
      if (element.attr('autoplay') != null) settings.autoplay = true;
      if (element.attr('loop') != null) settings.loop = true;
      if (element.attr('preload') == 'none') settings.preload = false;
      if (options) {
        angular.forEach(options, function(v, k) {
          settings[k] = v;
        });
      }
      s.settings = settings;
      if (s.createPlayer.markup) element = _createPlayer(element, s.createPlayer);
      //include else case too
      var audio = new _audio(element, s);
      if (_useFlash && _hasFlash) {
        _injectFlash(audio);
        _attachFlashEvents(audio.wrapper, audio);
      } else if (_useFlash && !_hasFlash) {
        _flashError(audio);
      }
      if (!_useFlash || (_useFlash && _hasFlash)) _attachEvents(audio.wrapper, audio);
      return audio;
    }, _init = function (audio) {
      var player = audio.config.createPlayer;
      audio.wrapper.addClass(player.loadingClass);
    }, _loadStarted = function (audio) {
      var player   = audio.config.createPlayer,
          duration = angular.element(_q('.'+player.durationClass)),
          m        = Math.floor(audio.duration / 60),
          s        = Math.floor(audio.duration % 60);
      audio.wrapper.removeClass(player.loadingClass);
      duration.html(((m<10?'0':'')+m+':'+(s<10?'0':'')+s)); 
    }, _loadProgress = function (audio, arr) {
      var player   = audio.config.createPlayer,
          scrubber = angular.element(('.'+player.scrubberClass)),
          loaded   = angular.element(_q('.'+player.loaderClass));
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
          scrubber  = angular.element(_q('.'+player.scrubberClass)),
          tagHolder = angular.element(_q('.'+player.tagClass));
      tagHolder.children().remove();
      for (var i = 0; i < arr.length; i++) {
        if (arr[i]/1000 < audio.duration) {
          var place = (arr[i]/(audio.duration*1000))*scrubber[0].offsetWidth;
          tagHolder.append('<div class="audio-tag" style="left:'+place+'px;"></div>');
        }
      }
    }, _id = null, _tag = null, _url = null, _duration = null;

    return {
      create : function(id, options) {
        var element = angular.element(_q(id)),
            options = options || null;
        _id = id;
        _url = options.url;
        var player = _newPlayer(element, options);
        $window.player = player;
        return player;
      },
      setTag : function (tag, audio) {
        _tag = tag;
        var tagInterval = function() {
          setTimeout(function() {  
            if (audio.duration > 1) {
              _setTags(audio);
            } else {
              tagInterval();
            }
          }, 10);
        };
        tagInterval();
      },
      trackEnd : function () {
      
      },
      setVolume : function () {
        
      }
    };
  }]).
  factory('playerConfig', [function() {
    return { 
      flashPlayer : '\
        <object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" id="$1" width="1" height="1" name="$1" style="position: absolute; left: -1px;"> \
          <param name="movie" value="$2?playerInstance=player&datetime=$3"> \
          <param name="allowscriptaccess" value="always"> \
          <embed name="$1" src="$2?playerInstance=player&datetime=$3" width="1" height="1" allowscriptaccess="always"> \
        </object>',
      createPlayer: {
        markup: '\
          <div class="audio-play-pause"> \
            <p class="audio-play"></p> \
            <p class="audio-pause"></p> \
            <p class="audio-loading"></p> \
            <p class="audio-error"></p> \
          </div> \
          <div class="audio-scrubber"> \
            <div class="audio-progress"></div> \
            <div class="audio-loaded"></div> \
            <div class="audio-tags"></div> \
          </div> \
          <div class="audio-nextBack"> \
            <div class="audio-prevInst audio-none"></div> \
            <div class="audio-nextInst"></div> \
          </div> \
          <div class="audio-volume"> \
            <div class="audio-speaker audio-speaker-ion"></div> \
            <div class="audio-volume-holder"> \
              <div class="audio-value"></div> \
            </div> \
            <div class="audio-clickdetect"></div> \
          </div> \
          <div class="audio-time"> \
            <em class="audio-played">00:00</em>/<strong class="audio-duration">00:00</strong> \
          </div> \
          <div class="audio-error-message"></div>',
        playPauseClass: 'audio-play-pause',
        nextBackClass: 'audio-nextBack',
        nextInstClass: 'audio-nextInst',
        prevInstClass: 'audio-prevInst',
        scrubberClass: 'audio-scrubber',
        progressClass: 'audio-progress',
        loaderClass: 'audio-loaded',
        timeClass: 'audio-time',
        durationClass: 'audio-duration',
        playedClass: 'audio-played',
        errorMessageClass: 'audio-error-message',
        playingClass: 'audio-playing',
        loadingClass: 'audio-loading',
        tagClass: 'audio-tags',
        errorClass: 'audio-error',
        speakerClass: 'audio-speaker',
        speakerOnClass: 'audio-speaker-ion',
        speakerOfClass: 'audio-speaker-iof',
        speakerScrubber: 'audio-volume-holder',
        volumeClass: 'audio-value',
        volumeClickClass: 'audio-clickdetect'
      }
    };
  }])
})(window, window.angular);
