$(document).ready(function() {

(function($) {
	
	//Adding album object to global window for dev purposes
	window.Album = Backbone.Model.extend({});

	window.Albums = Backbone.Collection.extend({
		model: Album,
		url: 'albums.json' //hardcoding REST API for now
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
		currentTrackUrl: function() {
			var album = this.currentAlbum();
			return album.trackUrlAtIndex(this.get('currentTrackIndex'));	
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
                if (this.playlist.isFirstAlbum(currentAlbumIndex)) {
                    lastModelIndex = this.playlist.models.length - 1;
                    this.set({
                        'currentAlbumIndex': lastModelIndex
                    });
                } else {
                    this.set({
                        'currentAlbumIndex': currentAlbumIndex - 1
                    });
                }
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
			_.bindAll(this, 'render', 'remove');
			this.model.bind('remove', this.remove);
		},
		removeFromPlaylist: function() {
			console.log('removeFromPlaylist function called', this, this.model);
			this.remove(this.model);
		}
	});

	window.PlaylistView = Backbone.View.extend({
		tagName: 'section',
		className: 'playlist',
		initialize: function() {
			_.bindAll(this, 'render', 'renderAlbum', 'queueAlbum');
			this.template = _.template($('#playlist-template').html());
			
			this.collection.bind('refresh', this.render);
			this.collection.bind('add', this.renderAlbum);

			
			this.player = this.options.player;
			this.library = this.options.library;
			
			this.library.bind('select', this.queueAlbum);
			
		},
		render: function() {
			$(this.el).html(this.template(this.player.toJSON()));
			this.$('button.play').toggle(this.player.isStopped());
			this.$('button.pause').toggle(this.player.isPlaying());
			return this;
		},
		queueAlbum: function(album) {
			console.log('queue album called');
			this.collection.add(album);
		},
		renderAlbum: function(album) {
			console.log('render album called', this);
			var view = new PlaylistAlbumView({
				model: album,
				player: this.player,
				playlist: this.collection
			});
			this.$('ul').append(view.render().el);
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