// ==========================================================================
// Project:   Webtex - mainPage
// Copyright: ©2010 My Company, Inc.
// ==========================================================================
/*globals Webtex */

sc_require('resources/BespinEmbedded.js');

// This page describes the main user interface for your application.  
Webtex.mainPage = SC.Page.design({

	// The main pane is made visible on screen as soon as your app is loaded.
	// Add childViews to this pane for views to display immediately on page 
	// load.
	mainPane: SC.MainPane.design({
		childViews: 'toolBar leftPane editor'.w(),
		
		toolBar: SC.ToolbarView.design({
			layout: {top: 0, height: 50, right:0, left: 0},
			anchorLocation: SC.ANCHOR_TOP
		}),
		
		leftPane: SC.View.design({
			
		}),
		
		editor: SC.View.design({
			layout: {top: 50, left: 300, right: 0, bottom: 0},

			render: function(context, firstTime){
				context = context.begin('div').addClass('editor-field').push("Hello").end();
			},
			
			didCreateLayer: function(){
				SC.Event.add(window, "load", function(event) {
					console.log("Running");
					var embed = tiki.require("embedded");
					var node = SC.$('div.editor-field')[0];
					var bespin = embed.useBespin(node);
					bespin.setSetting("fontsize", 10);
					bespin.setSetting("tabstop", 4);
				});
			}
		})
	})

});
