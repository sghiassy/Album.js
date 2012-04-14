$(document).ready(function() {

(function($) {
	
	//Adding album object to global window for dev purposes
	window.Album = Backbone.Model.extend({
		isFirstTrack: function(index) {
            return index == 0;
        },

        isLastTrack: function(index) {
            return index >= this.get('tracks').length - 1;
        },

        trackUrlAtIndex: function(index) {
            if (this.get('tracks').length >= index) {
                return this.get('tracks')[index].url;
            }
            return null;
        }
    });

	window.Albums = Backbone.Collection.extend({
		model: Album,
		url: 'file:///Users/sghiassy/Documents/Dev/2012/Album.js/albums.json' //hardcoding REST API for now
	});

	window.Playlist = Albums.extend({
		ifFirstAlbum: function(index) {
			return (index == 0);
		},
		isLastAlbum: function(index) {
			return (index == (this.models.length - 1));
		}
	});

	//Its wierd that I'm using a Model here instead of a Collection... I know
	window.Player = Backbone.Model.extend({
		defaults: {
			'currentAlbumIndex': 0,
			'currentTrackIndex': 0,
			'state': 'stop'
		},
		initialize: function() {
			this.playlist = new Playlist();
		},
		play: function() {
			this.set({'state': 'play'});
		},
		pause: function() {
			this.set({'state': 'pause'});
		},
		isPlaying: function() {
			return (this.get('state') == 'play');	
		},
		isStopped: function() {
			return (!this.isPlaying());
		},
		currentAlbum: function() {
			return this.playlist.at(this.get('currentAlbumIndex'));
		},
		currentTrack: function() {
			return this.get('currentTrackIndex');
		},
		currentTrackUrl: function() {
			console.log('currentTrackUrl called');
			var album = this.currentAlbum();
			if(album) {
				return album.trackUrlAtIndex(this.get('currentTrackIndex'));
			} else {
				return null;
			}
		},
		nextTrack: function() {
            var currentTrackIndex = this.get('currentTrackIndex'),
            currentAlbumIndex = this.get('currentAlbumIndex');
            if (this.currentAlbum().isLastTrack(currentTrackIndex)) {
                if (this.playlist.isLastAlbum(currentAlbumIndex)) {
                    this.set({
                        'currentAlbumIndex': 0
                    });
                    this.set({
                        'currentTrackIndex': 0
                    });
                } else {
                    this.set({
                        'currentAlbumIndex': currentAlbumIndex + 1
                    });
                    this.set({
                        'currentTrackIndex': 0
                    });
                }
            } else {
                this.set({
                    'currentTrackIndex': currentTrackIndex + 1
                });
            }
            this.logCurrentAlbumAndTrack();
        },
        prevTrack: function() {
            var currentTrackIndex = this.get('currentTrackIndex'),
            currentAlbumIndex = this.get('currentAlbumIndex'),
            lastModelIndex = 0;
            if (this.currentAlbum().isFirstTrack(currentTrackIndex)) {
            	/*debugger;
                if (this.playlist.isFirstAlbum(currentAlbumIndex)) {
                    lastModelIndex = this.playlist.models.length - 1;
                    this.set({
                        'currentAlbumIndex': lastModelIndex
                    });
                } else {
                    this.set({
                        'currentAlbumIndex': currentAlbumIndex - 1
                    });
                }*/
                // In either case, go to last track on album
                var lastTrackIndex =
                this.currentAlbum().get('tracks').length - 1;
                this.set({
                    'currentTrackIndex': lastTrackIndex
                });
            } else {
                this.set({
                    'currentTrackIndex': currentTrackIndex - 1
                });
            }
            this.logCurrentAlbumAndTrack();
        },
        logCurrentAlbumAndTrack: function() {
            console.log("Player " +
            this.get('currentAlbumIndex') + ':' +
            this.get('currentTrackIndex'), this);
        }
	});

	window.library = new Albums();
	window.player = new Player();

	window.AlbumView = Backbone.View.extend({
		template: _.template($('#album-template').html()),
		tagName: 'li',
		className: 'artist',
		initialize: function() {
			_.bindAll(this, 'render'); //JS Housekeeping so that the defined functions have the proper context set to them
			//?????this.model.bind('change', this.render);
		},
		render: function() {
			var renderedContent = this.template(this.model.toJSON());
			$(this.el).html(renderedContent);
			return this;
		}
	});

	window.LibraryAlbumView = AlbumView.extend({
		events: {
			'click .queue.add' : 'select'
		},
		select: function() {
			 this.collection.trigger('select', this.model);
			 console.log('queue add button clicked');
		}
	});

	window.PlaylistAlbumView = AlbumView.extend({
		events: {
			'click .queue.remove': 'removeFromPlaylist'
		},
		intialize: function() {
			_.bindAll(this, 
							'render', 
							'remove',
							'updateState',
							'updateTrack');
							
			this.model.bind('remove', this.remove);
		},
		removeFromPlaylist: function() {
			console.log('removeFromPlaylist function called', this, this.model);
			this.remove(this.model);
		},
		updateState: function() {
			var isAlbumCurrent = (this.player.currentAlbum() === this.model);
			$(this.el).toggleClass('current', isAlbumCurrent);
		},

		updateTrack: function() {
			var isAlbumCurrent = (this.player.currentAlbum() === this.model);
			if (isAlbumCurrent) {
				var currentTrackIndex = this.player.get('currentTrackIndex');
				this.$("li").each(function(index, el) {
					$(el).toggleClass('current', index == currentTrackIndex);
				});
			}
			this.updateState();
		}
	});

	window.PlaylistView = Backbone.View.extend({
		tagName: 'section',
		className: 'playlist',
		events: {
			'click .play': 'play',
			'click .pause': 'pause',
			'click .next': 'nextTrack',
			'click .prev': 'prevTrack',
			'click .track': 'directPlay',
		},
		initialize: function() {
			_.bindAll(this, 'render',
                'renderAlbum',
                'updateState',
                'updateTrack',
                'queueAlbum',
                'directPlay');
			this.template = _.template($('#playlist-template').html());
			
			this.collection.bind('refresh', this.render);
			this.collection.bind('add', this.renderAlbum);

			
			this.player = this.options.player;
			this.player.bind('change:state', this.updateState);
			this.player.bind('change:currentTrackIndex', this.updateTrack);
			this.createAudio();
			
			this.library = this.options.library;
			this.library.bind('select', this.queueAlbum);
			
		},
		createAudio: function() {
			this.audio = new Audio();
		},

		render: function() {
			$(this.el).html(this.template(this.player.toJSON()));
			this.collection.each(this.renderAlbum);

			this.updateState();
			return this;
		},

		renderAlbum: function(album) {
			this.$('div').eq(0).css({display: 'block'});
			var view = new PlaylistAlbumView({
				model: album,
				player: this.player,
				playlist: this.collection
			});
			this.$("ul").append(view.render().el);
		},

		updateState: function() {
			this.updateTrack();
			this.$("button.play").toggle(this.player.isStopped());
			this.$("button.pause").toggle(this.player.isPlaying());
		},

		updateTrack: function() {
			this.audio.src = this.player.currentTrackUrl();
			if (this.player.get('state') == 'play') {
				this.audio.play();
			} else {
				this.audio.pause();
			}
		},

		queueAlbum: function(album) {
			this.collection.add(album);
		},

		play: function() {
			this.player.play();
			this.toggleClass();
		},

		pause: function() {
			this.player.pause();
			this.toggleClass();
		},

		nextTrack: function() {
			if (this.player.get('state') == 'play') {
				this.toggleClass();
				this.player.nextTrack();
				this.toggleClass();
			} else {
				this.player.nextTrack();
			}
		},

		prevTrack: function() {
			if (this.player.get('state') == 'play') {
				this.toggleClass();
				this.player.prevTrack();
				this.toggleClass();
			} else {
				this.player.prevTrack();
			}
		},
		toggleClass: function() {
			//debugger;
			this.$('.tracks li').eq(this.player.currentTrack()).toggleClass('currentSong');
		},
		directPlay: function() {
			console.log('direct play called', this);
		}
	});

	window.LibraryView = Backbone.View.extend({
		tagName: 'section',
		className: 'library',
		initialize: function() {
			_.bindAll(this, 'render');
			this.template = _.template($('#library-template').html());
			this.collection.bind('reset', this.render);
		},
		render: function() {
			var $albums;
			var collection = this.collection;
			$(this.el).html(this.template({}));
			$albums  = this.$('.albums');
			collection.each(function(album){
				var view = new LibraryAlbumView({
					model: album,
					collection: collection
				});
				$albums.append(view.render().el);
			});
			return this;
		}
	});

	window.BackboneTunes = Backbone.Router.extend({
		routes: {
			'' : 'home',
			'blank': 'blank'
		},
		initialize: function() {
			this.playlistView = new PlaylistView({
				collection: window.player.playlist,
				player: window.player,
				library: window.library
			});
			this.libraryView = new LibraryView({
				collection: window.library
			});
		},
		home: function() {
			var $container = $('#container');
			$container.empty();
			$container.append(this.libraryView.render().el);
			$container.append(this.playlistView.render().el);
		},
		blank: function() {
			$('#container').empty();
			$('#container').text('blank');
		}
	});

	$(function() {
		window.App = new BackboneTunes();
		Backbone.history.start();
	});
})(jQuery);
});