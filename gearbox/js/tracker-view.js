/**
 * Gearbox: a Web GUI for Transmission
 * 
 * Copyright (c) Mnemosyne LLC
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 2
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

Ext.namespace( 'Transmission' );

TrackerView = Ext.extend( Ext.Container,
{
    store: null,
    prefs: null,
    session: null,
    showBackups: false,
    showScrapes: false,
    torrentId: -1,
    addButton: null,
    editButton: null,
    removeButton: null,
    gridPanel: null,

    TRACKER_INACTIVE: 0,
    TRACKER_WAITING: 1,
    TRACKER_QUEUED: 2,
    TRACKER_ACTIVE: 3,

    /***
    ****
    ***/

    timeToStringRounded: function( seconds )
    {
        if( seconds > 60 )
            seconds -= ( seconds % 60 );
        return Transmission.fmt.timeInterval( seconds );
    },

    renderIcon: function( value, metadata, record, rowIndex, colIndex, store )
    {
        return [ '<img style="height: 16px; width: 16px;" src="http://', value, '/favicon.ico" height="16" width="16" />' ].join('');
    },

    renderTracker: function( value, metadata, record, rowIndex, colIndex, store )
    {
        var d = record.data,
            strings = [ ],
            now = new Date().getTime() / 1000,
            err_markup_begin = '<span style="color:red">',
            err_markup_end = '</span>',
            timeout_markup_begin = '<span style="color:#224466">',
            timeout_markup_end = '</span>',
            success_markup_begin = '<span style="color:#008B00">',
            success_markup_end = '</span>';

        // hostname
        strings.push( '<div style="overflow:hidden;">',
                      '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">',
                      record.data.isBackup ? '<i>' : '<b>',
                      record.data.uri.host, ':', record.data.uri.port,
                      record.data.isBackup ? '</i>' : '</b>',
                      '</div>' );

        // announce & scrape info
        if( !d.isBackup )
        {
            if( d.hasAnnounced && ( d.announceState != this.TRACKER_INACTIVE ) )
            {
                var tstr =  this.timeToStringRounded( now - d.lastAnnounceTime );

                strings.push( '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">' );
                if( d.lastAnnounceSucceeded )
                {
                    strings.push( 'Got a list of ',
                                  success_markup_begin, Ext.util.Format.plural( d.lastAnnouncePeerCount, 'peer' ), success_markup_end,
                                  ' ', tstr, ' ago' );
                }
                else if( d.lastAnnounceTimedOut )
                {
                    strings.push( 'Peer list request ',
                                  timeout_markup_begin, 'timed out', timeout_markup_end,
                                  ' ', tstr, ' ago; will retry' );
                }
                else
                {
                    strings.push( 'Got an error ',
                                  err_markup_begin, '"', d.lastAnnounceResult, '"', err_markup_end,
                                  ' ', tstr, ' ago' );
                }
                strings.push( '</div>' );
            }

            switch( d.announceState )
            {
                case this.TRACKER_INACTIVE:
                    strings.push( '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">',
                                  'No updates scheduled',
                                  '</div>' );
                    break;

                case this.TRACKER_WAITING:
                    strings.push( '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">',
                                  'Asking for more peers in ', this.timeToStringRounded( d.nextAnnounceTime - now ),
                                  '</div>' );
                    break;

                case this.TRACKER_QUEUED:
                    strings.push( '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">',
                                  'Queued to ask for more peers',
                                  '</div>' );
                    break;

                case this.TRACKER_ACTIVE:
                    strings.push( '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">',
                                  'Asking for more peers now...',
                                  '<small>', this.timeToStringRounded( now - d.lastAnnounceStartTime ), '</small>',
                                  '</div>' );
                    break;
            }

            if( this.showScrapes )
            {
                if( d.hasScraped )
                {
                    var tstr = this.timeToStringRounded( now - d.lastScrapeTime );

                    strings.push( '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">' );
                    if( d.lastScrapeSucceeded )
                    {
                        strings.push( 'Tracker had ',
                                      success_markup_begin, Ext.util.Format.plural( d.seederCount, 'seeder' ), success_markup_end,
                                      ' and ',
                                      success_markup_begin, Ext.util.Format.plural( d.leecherCount, 'leecher' ), success_markup_end,
                                      ' ', tstr, ' ago' );
                    }
                    else
                    {
                        strings.push( 'Got a scrape error ',
                                      err_markup_begin, '"', d.lastScrapeResult, '"', err_markup_end,
                                      ' ', tstr, ' ago' );
                    }
                    strings.push( '</div>' );
                }

                switch( d.scrapeState )
                {
                    case this.TRACKER_INACTIVE:
                        break;

                    case this.TRACKER_WAITING:
                        strings.push( '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">',
                                      'Asking for peer counts in ', this.timeToStringRounded( d.nextScrapeTime - now ),
                                      '</div>' );
                        break;

                    case this.TRACKER_QUEUED:
                        strings.push( '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">',
                                      'Queued to ask for peer counts',
                                      '</div>' );
                        break;

                    case this.TRACKER_ACTIVE:
                        strings.push( '<div style="overflow:hidden;text-overflow: ellipsis;white-space: nowrap;">',
                                      'Asking for peer counts now... ',
                                      '<small>', this.timeToStringRounded( now - d.lastScrapeStartTime ), '</small>',
                                      '</div>' );
                        break;
                }
            }
        }

        strings.push( '</div>' ); // layout: table cell
        return strings.join('');
    },

    refresh: function( record )
    {
        if( record.getId() !== this.torrentId )
            return;

        // FIXME: use reload() instead?
        this.store.loadData( record.data );
    },

    onShowBackupsChecked: function( checkbox, isChecked )
    {
        this.prefs.set({ 'show-backup-trackers': isChecked });
    },

    onShowScrapesChecked: function( checkbox, isChecked )
    {
        this.prefs.set({ 'show-tracker-scrapes': isChecked });
    },

    onPrefsChanged: function( keys )
    {
        for( var i=keys.length; i--; )
        {
            var key = keys[i];

            if( key == 'show-backup-trackers' )
            {
                var b = this.prefs.getBool( key );
                Ext.getCmp(key).setValue( b );
                this.showBackups = b;

                this.refilter( );
            }
            else if( key == 'show-tracker-scrapes' )
            {
                var b = this.prefs.getBool( key );
                Ext.getCmp(key).setValue( b );
                this.showScrapes = b;

                var v = this.gridPanel.getView();
                if( v.grid != null )
                    v.refresh( false );
            }
        }
    },

    destroy: function( )
    {
        this.prefs.removeListener( 'onPrefsChanged', this.onPrefsChanged );
        this.superclass().destroy.call( this );
    },

    filterFunc: function( record, id )
    {
        return this.showBackups || !record.data.isBackup;
    },

    refilter: function( )
    {
        this.store.filterBy( this.filterFunc, this );
    },

    onSelectionChanged: function( )
    {
        var hasSelection = this.gridPanel.getSelectionModel().hasSelection();

        this.addButton.setDisabled( false );
        this.editButton.setDisabled( !hasSelection );
        this.removeButton.setDisabled( !hasSelection );
    },

    onStoreLoaded: function( )
    {
        this.refilter( );
        this.onSelectionChanged( );
    },

    onAddPrompted: function( id, text )
    {
        if( id == 'ok' )
        {
            var url = text.trim( );
            this.session.addTrackers( this.torrentId, [ url ] );
        }
    },
    onAddClicked: function( )
    {
        Ext.Msg.prompt( 'Add Announce URL', 'Enter the Announce URL to be added:', this.onAddPrompted, this );
    },

    oldUrl: null,

    onEditPrompted: function( id, text )
    {
        if( id == 'ok' )
        {
            var newUrl = text.trim( );
            this.session.replaceTracker( this.torrentId, this.oldUrl, newUrl );
        }
    },

    onEditClicked: function( )
    {
        var url = this.gridPanel.getSelectionModel().getSelected().data.announce;
        this.oldUrl = url;
        Ext.Msg.prompt( 'Edit URL', 'Edit this Announce URL:', this.onEditPrompted, this, false, url );
    },

    onRemoveClicked: function( )
    {
        var records = this.gridPanel.getSelectionModel().getSelections(),
            i = records.length,
            urls = new Array( i );
        while( i-- )
            urls[i] = records[i].data.announce;
        this.session.removeTrackers( this.torrentId, urls );
    },

    onRecordsLoaded: function( store, records, options )
    {
        for( var i=records.length; i--; )
        {
            var data = records[i].data;
            data.uri = data.uri || parseUri(data.announce);
            data.host = getHost(data.uri);
        }
    },

    constructor: function( config_in )
    {
        this.torrentId = config_in.record.getId();
        this.prefs = config_in.prefs;
        this.session = config_in.session;

        var record = Ext.data.Record.create([
            {name: 'announceState', type: 'int'},
            {name: 'announce', type: 'string'},
            {name: 'downloadCount', type: 'int'},
            {name: 'hasAnnounced', type: 'bool'},
            {name: 'hasScraped', type: 'bool'},
            {name: 'host', type: 'string'},
            {name: 'id', type: 'int'},
            {name: 'isBackup', type: 'bool'},
            {name: 'lastAnnouncePeerCount', type: 'int'},
            {name: 'lastAnnounceResult', type: 'string'},
            {name: 'lastAnnounceStartTime', type: 'int'},
            {name: 'lastAnnounceSucceeded', type: 'bool'},
            {name: 'lastAnnounceTimedOut', type: 'bool'},
            {name: 'lastAnnounceTime', type: 'int'},
            {name: 'lastScrapeResult', type: 'string'},
            {name: 'lastScrapeStartTime', type: 'int'},
            {name: 'lastScrapeSucceeded', type: 'bool'},
            {name: 'lastScrapeTimedOut', type: 'bool'},
            {name: 'lastScrapeTime', type: 'int'},
            {name: 'leecherCount', type: 'int'},
            {name: 'nextAnnounceTime', type: 'int'},
            {name: 'nextScrapeTime', type: 'int'},
            {name: 'scrapeState', type: 'int'},
            {name: 'scrape', type: 'string'},
            {name: 'seederCount', type: 'int'},
            {name: 'tier', type: 'int'},
            {name: 'uri', type: 'auto'}
        ]);

        var reader = new Ext.data.JsonReader({
                root: 'trackerStats',
                fields: record }, record );

        this.store = new Ext.data.Store({ reader: reader });
        this.store.addListener( 'load', this.onRecordsLoaded, this );

        var imgDir = Transmission.imgRoot + '/16x16/actions';
        var config = Ext.apply( {}, config_in, { layout : 'border', items: [
            { region: 'east', xtype: 'container', layout: { type: 'vbox', padding: '5', align: 'stretch' }, width: 40, items: [
                { xtype: 'button', id: 'add-tracker-button', text: 'Add', tooltip: 'Add a Tracker', margin: { bottom: 30 } },
                { xtype: 'button', id: 'edit-tracker-button', text: 'Edit', tooltip: 'Edit the selected Tracker'  },
                { xtype: 'button', id: 'remove-tracker-button', text: 'Remove', tooltip: 'Remove the selected Tracker' }]},
            { region: 'south', xtype: 'container', layout: { type: 'vbox', padding: '5', align: 'stretch' }, height: 50, items: [
                { xtype: 'checkbox', boxLabel: 'Show more details', id: 'show-tracker-scrapes', listeners: { check: { scope: this, fn: this.onShowScrapesChecked } } },
                { xtype: 'checkbox', boxLabel: 'Show backup trackers', id: 'show-backup-trackers', listeners: { check: { scope: this, fn: this.onShowBackupsChecked }}}]},
            { region: 'center', xtype: 'grid', layout: 'fit', id: 'tracker-grid-panel',
                columns: [
                    { id: 'favcol', header: 'Bar', dataIndex: 'host', width: 24, renderer: { fn: this.renderIcon, scope: this } },
                    { id: 'maincol', header: 'Foo', dataIndex: 'id', renderer: { fn: this.renderTracker, scope: this } } ],
                store: this.store,
                hideHeaders: true,
                hideLabel: true,
                multiSelect: true,
                stripeRows: true,
                autoExpandColumn: 'maincol' }
        ]});
        this.superclass().constructor.call( this, config );

        this.gridPanel = Ext.getCmp('tracker-grid-panel');
        this.gridPanel.getSelectionModel().addListener( 'selectionchange', this.onSelectionChanged, this );

        this.addButton = Ext.getCmp( 'add-tracker-button' );
        this.addButton.addListener( 'click', this.onAddClicked, this );
        this.editButton = Ext.getCmp( 'edit-tracker-button' );
        this.editButton.addListener( 'click', this.onEditClicked, this );
        this.removeButton = Ext.getCmp( 'remove-tracker-button' );
        this.removeButton.addListener( 'click', this.onRemoveClicked, this );

        this.refresh( config.record );
        this.prefs.addListener( 'onPrefsChanged', this.onPrefsChanged, this );
        this.onPrefsChanged( [ 'show-backup-trackers', 'show-tracker-scrapes' ] );
        this.store.addListener( 'load', this.onStoreLoaded, this );
    }
});

Ext.reg( 'trackerview', TrackerView );
