

(function($) {
	
	//Adding album object to global window for dev purposes
	window.Album = Backbone.Model.extend({});

	window.Albums = Backbone.Collection.extend({
		model: Album,
		url: 'albums.json' //hardcoding REST API for now
	});

	window.AlbumView = Backbone.View.extend({
		tagName: 'li',
		className: 'artist',
		initialize: function() {
			_.bindAll(this, 'render'); //JS Housekeeping so that the defined functions have the proper context set to them
			this.model.bind('change', this.render);
			this.template = _.template($('#album-template').html());
		},
		render: function() {
			var renderedContent = this.template(this.model.toJSON());
			$(this.el).html(renderedContent);
			return this;
		}
	});

	window.LibraryAlbumView = AlbumView.extend({
		
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
})(jQuery);

library = new Albums();
libraryView = new LibraryView({collection: library});
$('#container').append(libraryView.render().el); 
library.fetch();
