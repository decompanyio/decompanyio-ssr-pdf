/* Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*globals require, chrome */

'use strict';

let DEFAULT_URL = '';

let pdfjsWebLibs = {
    pdfjsWebPDFJS: window.pdfjsDistBuildPdf
};

(function () {


    (function (root, factory) {
            factory((root.pdfjsWebGrabToPan = {}));

    }(this, function (exports) {
        /**
         * Construct a GrabToPan instance for a given HTML element.
         * @param options.element {Element}
         * @param options.ignoreTarget {function} optional. See `ignoreTarget(node)`
         * @param options.onActiveChanged {function(boolean)} optional. Called
         *  when grab-to-pan is (de)activated. The first argument is a boolean that
         *  shows whether grab-to-pan is activated.
         */
        function GrabToPan(options) {
            this.element = options.element;
            this.document = options.element.ownerDocument;
            if (typeof options.ignoreTarget === 'function') {
                this.ignoreTarget = options.ignoreTarget;
            }
            this.onActiveChanged = options.onActiveChanged;

            // Bind the contexts to ensure that `this` always points to
            // the GrabToPan instance.
            this.activate = this.activate.bind(this);
            this.deactivate = this.deactivate.bind(this);
            this.toggle = this.toggle.bind(this);
            this._onmousedown = this._onmousedown.bind(this);
            this._onmousemove = this._onmousemove.bind(this);
            this._endPan = this._endPan.bind(this);

            // This overlay will be inserted in the document when the mouse moves during
            // a grab operation, to ensure that the cursor has the desired appearance.
            let overlay = this.overlay = document.createElement('div');
            overlay.className = 'grab-to-pan-grabbing';
        }

        GrabToPan.prototype = {
            /**
             * Class name of element which can be grabbed
             */
            CSS_CLASS_GRAB: 'grab-to-pan-grab',

            /**
             * Bind a mousedown event to the element to enable grab-detection.
             */
            activate: function GrabToPan_activate() {
                if (!this.active) {
                    this.active = true;
                    this.element.addEventListener('mousedown', this._onmousedown, true);
                    this.element.classList.add(this.CSS_CLASS_GRAB);
                    if (this.onActiveChanged) {
                        this.onActiveChanged(true);
                    }
                }
            },

            /**
             * Removes all events. Any pending pan session is immediately stopped.
             */
            deactivate: function GrabToPan_deactivate() {
                if (this.active) {
                    this.active = false;
                    this.element.removeEventListener('mousedown', this._onmousedown, true);
                    this._endPan();
                    this.element.classList.remove(this.CSS_CLASS_GRAB);
                    if (this.onActiveChanged) {
                        this.onActiveChanged(false);
                    }
                }
            },

            toggle: function GrabToPan_toggle() {
                if (this.active) {
                    this.deactivate();
                } else {
                    this.activate();
                }
            },

            /**
             * Whether to not pan if the target element is clicked.
             * Override this method to change the default behaviour.
             *
             * @param node {Element} The target of the event
             * @return {boolean} Whether to not react to the click event.
             */
            ignoreTarget: function GrabToPan_ignoreTarget(node) {
                // Use matchesSelector to check whether the clicked element
                // is (a child of) an input element / link
                return node[matchesSelector](
                    'a[href], a[href] *, input, textarea, button, button *, select, option'
                );
            },

            /**
             * @private
             */
            _onmousedown: function GrabToPan__onmousedown(event) {
                if (event.button !== 0 || this.ignoreTarget(event.target)) {
                    return;
                }
                if (event.originalTarget) {
                    try {
                        /* jshint expr:true */
                        event.originalTarget.tagName;
                    } catch (e) {
                        // Mozilla-specific: element is a scrollbar (XUL element)
                        return;
                    }
                }

                this.scrollLeftStart = this.element.scrollLeft;
                this.scrollTopStart = this.element.scrollTop;
                this.clientXStart = event.clientX;
                this.clientYStart = event.clientY;
                this.document.addEventListener('mousemove', this._onmousemove, true);
                this.document.addEventListener('mouseup', this._endPan, true);
                // When a scroll event occurs before a mousemove, assume that the user
                // dragged a scrollbar (necessary for Opera Presto, Safari and IE)
                // (not needed for Chrome/Firefox)
                this.element.addEventListener('scroll', this._endPan, true);
                event.preventDefault();
                event.stopPropagation();
                this.document.documentElement.classList.add(this.CSS_CLASS_GRABBING);

                let focusedElement = document.activeElement;
                if (focusedElement && !focusedElement.contains(event.target)) {
                    focusedElement.blur();
                }
            },

            /**
             * @private
             */
            _onmousemove: function GrabToPan__onmousemove(event) {
                this.element.removeEventListener('scroll', this._endPan, true);
                if (isLeftMouseReleased(event)) {
                    this._endPan();
                    return;
                }
                let xDiff = event.clientX - this.clientXStart;
                let yDiff = event.clientY - this.clientYStart;
                this.element.scrollTop = this.scrollTopStart - yDiff;
                this.element.scrollLeft = this.scrollLeftStart - xDiff;
                if (!this.overlay.parentNode) {
                    document.body.appendChild(this.overlay);
                }
            },

            /**
             * @private
             */
            _endPan: function GrabToPan__endPan() {
                this.element.removeEventListener('scroll', this._endPan, true);
                this.document.removeEventListener('mousemove', this._onmousemove, true);
                this.document.removeEventListener('mouseup', this._endPan, true);
                if (this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
            }
        };

        // Get the correct (vendor-prefixed) name of the matches method.
        let matchesSelector;
        ['webkitM', 'mozM', 'msM', 'oM', 'm'].some(function (prefix) {
            let name = prefix + 'atches';
            if (name in document.documentElement) {
                matchesSelector = name;
            }
            name += 'Selector';
            if (name in document.documentElement) {
                matchesSelector = name;
            }
            return matchesSelector; // If found, then truthy, and [].some() ends.
        });

        // Browser sniffing because it's impossible to feature-detect
        // whether event.which for onmousemove is reliable
        let isNotIEorIsIE10plus = !document.documentMode || document.documentMode > 9;
        let chrome = window.chrome;
        let isChrome15OrOpera15plus = chrome && (chrome.webstore || chrome.app);
        //                                       ^ Chrome 15+       ^ Opera 15+
        let isSafari6plus = /Apple/.test(navigator.vendor) &&
            /Version\/([6-9]\d*|[1-5]\d+)/.test(navigator.userAgent);

        /**
         * Whether the left mouse is not pressed.
         * @param event {MouseEvent}
         * @return {boolean} True if the left mouse button is not pressed.
         *                   False if unsure or if the left mouse button is pressed.
         */
        function isLeftMouseReleased(event) {
            if ('buttons' in event && isNotIEorIsIE10plus) {
                // http://www.w3.org/TR/DOM-Level-3-Events/#events-MouseEvent-buttons
                // Firefox 15+
                // Internet Explorer 10+
                return !(event.buttons | 1);
            }
            if (isChrome15OrOpera15plus || isSafari6plus) {
                // Chrome 14+
                // Opera 15+
                // Safari 6.0+
                return event.which === 0;
            }
        }

        exports.GrabToPan = GrabToPan;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebOverlayManager = {}));
        }
    }(this, function (exports) {

        let OverlayManager = {
            overlays: {},
            active: null,

            /**
             * @param {string} name The name of the overlay that is registered.
             * @param {HTMLDivElement} element The overlay's DOM element.
             * @param {function} callerCloseMethod (optional) The method that, if present,
             *                   will call OverlayManager.close from the Object
             *                   registering the overlay. Access to this method is
             *                   necessary in order to run cleanup code when e.g.
             *                   the overlay is force closed. The default is null.
             * @param {boolean} canForceClose (optional) Indicates if opening the overlay
             *                  will close an active overlay. The default is false.
             * @returns {Promise} A promise that is resolved when the overlay has been
             *                    registered.
             */
            register: function overlayManagerRegister(name, element,
                                                      callerCloseMethod, canForceClose) {
                return new Promise(function (resolve) {
                    let container;
                    if (!name || !element || !(container = element.parentNode)) {
                        throw new Error('Not enough parameters.');
                    } else if (this.overlays[name]) {
                        throw new Error('The overlay is already registered.');
                    }
                    this.overlays[name] = {
                        element: element,
                        container: container,
                        callerCloseMethod: (callerCloseMethod || null),
                        canForceClose: (canForceClose || false)
                    };
                    resolve();
                }.bind(this));
            },

            /**
             * @param {string} name The name of the overlay that is unregistered.
             * @returns {Promise} A promise that is resolved when the overlay has been
             *                    unregistered.
             */
            unregister: function overlayManagerUnregister(name) {
                return new Promise(function (resolve) {
                    if (!this.overlays[name]) {
                        throw new Error('The overlay does not exist.');
                    } else if (this.active === name) {
                        throw new Error('The overlay cannot be removed while it is active.');
                    }
                    delete this.overlays[name];

                    resolve();
                }.bind(this));
            },

            /**
             * @param {string} name The name of the overlay that should be opened.
             * @returns {Promise} A promise that is resolved when the overlay has been
             *                    opened.
             */
            open: function overlayManagerOpen(name) {
                return new Promise(function (resolve) {
                    if (!this.overlays[name]) {
                        throw new Error('The overlay does not exist.');
                    } else if (this.active) {
                        if (this.overlays[name].canForceClose) {
                            this._closeThroughCaller();
                        } else if (this.active === name) {
                            throw new Error('The overlay is already active.');
                        } else {
                            throw new Error('Another overlay is currently active.');
                        }
                    }
                    this.active = name;
                    this.overlays[this.active].element.classList.remove('hidden');
                    this.overlays[this.active].container.classList.remove('hidden');

                    window.addEventListener('keydown', this._keyDown);
                    resolve();
                }.bind(this));
            },

            /**
             * @param {string} name The name of the overlay that should be closed.
             * @returns {Promise} A promise that is resolved when the overlay has been
             *                    closed.
             */
            close: function overlayManagerClose(name) {
                return new Promise(function (resolve) {
                    if (!this.overlays[name]) {
                        throw new Error('The overlay does not exist.');
                    } else if (!this.active) {
                        throw new Error('The overlay is currently not active.');
                    } else if (this.active !== name) {
                        throw new Error('Another overlay is currently active.');
                    }
                    this.overlays[this.active].container.classList.add('hidden');
                    this.overlays[this.active].element.classList.add('hidden');
                    this.active = null;

                    window.removeEventListener('keydown', this._keyDown);
                    resolve();
                }.bind(this));
            },

            /**
             * @private
             */
            _keyDown: function overlayManager_keyDown(evt) {
                let self = OverlayManager;
                if (self.active && evt.keyCode === 27) { // Esc key.
                    self._closeThroughCaller();
                    evt.preventDefault();
                }
            },

            /**
             * @private
             */
            _closeThroughCaller: function overlayManager_closeThroughCaller() {
                if (this.overlays[this.active].callerCloseMethod) {
                    this.overlays[this.active].callerCloseMethod();
                }
                if (this.active) {
                    this.close(this.active);
                }
            }
        };

        exports.OverlayManager = OverlayManager;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFHistory = {}));
        }
    }(this, function (exports) {

        function PDFHistory(options) {
            this.linkService = options.linkService;

            this.initialized = false;
        }

        PDFHistory.prototype = {
            /**
             * @param {string} fingerprint
             * @param {IPDFLinkService} linkService
             */
            initialize: function pdfHistoryInitialize(fingerprint) {
                this.initialized = true;
                this.reInitialized = false;
                this.allowHashChange = true;
                this.historyUnlocked = true;
                this.isViewerInPresentationMode = false;

                this.previousHash = window.location.hash.substring(1);
                this.currentPage = 0;
                this.previousPage = 0;
                this.nextHashParam = '';

                this.fingerprint = fingerprint;
                this.currentUid = this.uid = 0;
                this.current = {};

                let state = window.history.state;
                if (this._isStateObjectDefined(state)) {
                    // This corresponds to navigating back to the document
                    // from another page in the browser history.
                    if (state.target.dest) {
                        this.initialDestination = state.target.dest;
                    }
                    this.currentUid = state.uid;
                    this.uid = state.uid + 1;
                    this.current = state.target;
                } else {
                    // This corresponds to the loading of a new document.
                    if (state && state.fingerprint &&
                        this.fingerprint !== state.fingerprint) {
                        // Reinitialize the browsing history when a new document
                        // is opened in the web viewer.
                        this.reInitialized = true;
                    }
                    this._pushOrReplaceState({fingerprint: this.fingerprint}, true);
                }

                let self = this;
                window.addEventListener('popstate', function pdfHistoryPopstate(evt) {
                    if (!self.historyUnlocked) {
                        return;
                    }
                    if (evt.state) {
                        // Move back/forward in the history.
                        self._goTo(evt.state);
                        return;
                    }

                    // If the state is not set, then the user tried to navigate to a
                    // different hash by manually editing the URL and pressing Enter, or by
                    // clicking on an in-page link (e.g. the "current view" link).
                    // Save the current view state to the browser history.

                    // Note: In Firefox, history.null could also be null after an in-page
                    // navigation to the same URL, and without dispatching the popstate
                    // event: https://bugzilla.mozilla.org/show_bug.cgi?id=1183881

                    if (self.uid === 0) {
                        // Replace the previous state if it was not explicitly set.
                        let previousParams = {page: 1};
                        replacePreviousHistoryState(previousParams, function () {
                            updateHistoryWithCurrentHash();
                        });
                    } else {
                        updateHistoryWithCurrentHash();
                    }
                }, false);


                function updateHistoryWithCurrentHash() {
                    self.previousHash = window.location.hash.slice(1);
                    self._pushToHistory({hash: self.previousHash}, false, true);
                }

                function replacePreviousHistoryState(params, callback) {
                    // To modify the previous history entry, the following happens:
                    // 1. history.back()
                    // 2. _pushToHistory, which calls history.replaceState( ... )
                    // 3. history.forward()
                    // Because a navigation via the history API does not immediately update
                    // the history state, the popstate event is used for synchronization.
                    self.historyUnlocked = false;

                    // Suppress the hashchange event to avoid side effects caused by
                    // navigating back and forward.
                    self.allowHashChange = false;
                    window.addEventListener('popstate', rewriteHistoryAfterBack);
                    history.back();

                    function rewriteHistoryAfterBack() {
                        window.removeEventListener('popstate', rewriteHistoryAfterBack);
                        window.addEventListener('popstate', rewriteHistoryAfterForward);
                        self._pushToHistory(params, false, true);
                        history.forward();
                    }

                    function rewriteHistoryAfterForward() {
                        window.removeEventListener('popstate', rewriteHistoryAfterForward);
                        self.allowHashChange = true;
                        self.historyUnlocked = true;
                        callback();
                    }
                }

                function pdfHistoryBeforeUnload() {
                    let previousParams = self._getPreviousParams(null, true);
                    if (previousParams) {
                        let replacePrevious = (!self.current.dest &&
                            self.current.hash !== self.previousHash);
                        self._pushToHistory(previousParams, false, replacePrevious);
                    }
                    // Remove the event listener when navigating away from the document,
                    // since 'beforeunload' prevents Firefox from caching the document.
                    window.removeEventListener('beforeunload', pdfHistoryBeforeUnload,
                        false);
                }

                window.addEventListener('beforeunload', pdfHistoryBeforeUnload, false);

                window.addEventListener('pageshow', function pdfHistoryPageShow(evt) {
                    // If the entire viewer (including the PDF file) is cached in
                    // the browser, we need to reattach the 'beforeunload' event listener
                    // since the 'DOMContentLoaded' event is not fired on 'pageshow'.
                    window.addEventListener('beforeunload', pdfHistoryBeforeUnload, false);
                }, false);

                window.addEventListener('presentationmodechanged', function (e) {
                    self.isViewerInPresentationMode = !!e.detail.active;
                });
            },

            clearHistoryState: function pdfHistory_clearHistoryState() {
                this._pushOrReplaceState(null, true);
            },

            _isStateObjectDefined: function pdfHistory_isStateObjectDefined(state) {
                return !!(state && state.uid >= 0 &&
                    state.fingerprint && this.fingerprint === state.fingerprint &&
                    state.target && state.target.hash);
            },

            _pushOrReplaceState: function pdfHistory_pushOrReplaceState(stateObj,
                                                                        replace) {
                if (replace) {
                    window.history.replaceState(stateObj, '', document.URL);
                } else {
                    window.history.pushState(stateObj, '', document.URL);
                }
            },

            get isHashChangeUnlocked() {
                if (!this.initialized) {
                    return true;
                }
                return this.allowHashChange;
            },

            updateNextHashParam: function pdfHistoryUpdateNextHashParam(param) {
                if (this.initialized) {
                    this.nextHashParam = param;
                }
            },

            push: function pdfHistoryPush(params) {
                if (!(this.initialized && this.historyUnlocked)) {
                    return;
                }
                if (params.dest && !params.hash) {
                    params.hash = (this.current.hash && this.current.dest &&
                        this.current.dest === params.dest) ?
                        this.current.hash :
                        this.linkService.getDestinationHash(params.dest).split('#')[1];
                }
                if (params.page) {
                    params.page |= 0;
                }

                if (this.nextHashParam) {
                    if (this.nextHashParam === params.hash) {
                        this.nextHashParam = null;
                        return;
                    } else {
                        this.nextHashParam = null;
                    }
                }

                if (params.hash) {
                    if (this.current.hash) {
                        if (this.current.hash !== params.hash) {
                            this._pushToHistory(params, true);
                        } else {
                            if (!this.current.page && params.page) {
                                this._pushToHistory(params, false, true);
                            }
                        }
                    } else {
                        this._pushToHistory(params, true);
                    }
                } else if (this.current.page && params.page &&
                    this.current.page !== params.page) {
                    this._pushToHistory(params, true);
                }
            },

            _getPreviousParams: function pdfHistory_getPreviousParams(onlyCheckPage,
                                                                      beforeUnload) {
                if (this.current.page || onlyCheckPage) {
                    if (this.previousPage === this.currentPage) {
                        return null;
                    }
                } else {
                    return null;
                }
                let params = {page: this.currentPage};
                if (this.isViewerInPresentationMode) {
                    params.hash = null;
                }
                return params;
            },

            _stateObj: function pdfHistory_stateObj(params) {
                return {fingerprint: this.fingerprint, uid: this.uid, target: params};
            },

            _pushToHistory: function pdfHistory_pushToHistory(params,
                                                              addPrevious, overwrite) {
                if (!this.initialized) {
                    return;
                }
                if (!params.hash && params.page) {
                    params.hash = ('page=' + params.page);
                }
                if (addPrevious && !overwrite) {
                    let previousParams = this._getPreviousParams();
                    if (previousParams) {
                        let replacePrevious = (!this.current.dest &&
                            this.current.hash !== this.previousHash);
                        this._pushToHistory(previousParams, false, replacePrevious);
                    }
                }
                this._pushOrReplaceState(this._stateObj(params),
                    (overwrite || this.uid === 0));
                this.currentUid = this.uid++;
                this.current = params;
            },

            _goTo: function pdfHistory_goTo(state) {
                if (!(this.initialized && this.historyUnlocked &&
                    this._isStateObjectDefined(state))) {
                    return;
                }
                if (!this.reInitialized && state.uid < this.currentUid) {
                    let previousParams = this._getPreviousParams(true);
                    if (previousParams) {
                        this._pushToHistory(this.current, false);
                        this._pushToHistory(previousParams, false);
                        this.currentUid = state.uid;
                        window.history.back();
                        return;
                    }
                }
                this.historyUnlocked = false;

                if (state.target.dest) {
                    this.linkService.navigateTo(state.target.dest);
                } else {
                    this.linkService.setHash(state.target.hash);
                }
                this.currentUid = state.uid;
                if (state.uid > this.uid) {
                    this.uid = state.uid;
                }
                this.current = state.target;

                let currentHash = window.location.hash.substring(1);
                if (this.previousHash !== currentHash) {
                    this.allowHashChange = false;
                }
                this.previousHash = currentHash;

                this.historyUnlocked = true;
            },

            back: function pdfHistoryBack() {
                this.go(-1);
            },

            forward: function pdfHistoryForward() {
                this.go(1);
            },

            go: function pdfHistoryGo(direction) {
                if (this.initialized && this.historyUnlocked) {
                    let state = window.history.state;
                    if (direction === -1 && state && state.uid > 0) {
                        window.history.back();
                    } else if (direction === 1 && state && state.uid < (this.uid - 1)) {
                        window.history.forward();
                    }
                }
            }
        };

        exports.PDFHistory = PDFHistory;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFPresentationMode = {}));
        }
    }(this, function (exports) {

        let DELAY_BEFORE_RESETTING_SWITCH_IN_PROGRESS = 1500; // in ms
        let DELAY_BEFORE_HIDING_CONTROLS = 3000; // in ms
        let ACTIVE_SELECTOR = 'pdfPresentationMode';
        let CONTROLS_SELECTOR = 'pdfPresentationModeControls';

        /**
         * @typedef {Object} PDFPresentationModeOptions
         * @property {HTMLDivElement} container - The container for the viewer element.
         * @property {HTMLDivElement} viewer - (optional) The viewer element.
         * @property {PDFViewer} pdfViewer - The document viewer.
         * @property {Array} contextMenuItems - (optional) The menuitems that are added
         *   to the context menu in Presentation Mode.
         */

        /**
         * @class
         */
        let PDFPresentationMode = (function PDFPresentationModeClosure() {
            /**
             * @constructs PDFPresentationMode
             * @param {PDFPresentationModeOptions} options
             */
            function PDFPresentationMode(options) {
                this.container = options.container;
                this.viewer = options.viewer || options.container.firstElementChild;
                this.pdfViewer = options.pdfViewer;
                let contextMenuItems = options.contextMenuItems || null;

                this.active = false;
                this.args = null;
                this.contextMenuOpen = false;
                this.mouseScrollTimeStamp = 0;
                this.mouseScrollDelta = 0;

                if (contextMenuItems) {
                    for (let i = 0, ii = contextMenuItems.length; i < ii; i++) {
                        let item = contextMenuItems[i];
                        item.element.addEventListener('click', function (handler) {
                            this.contextMenuOpen = false;
                            handler();
                        }.bind(this, item.handler));
                    }
                }
            }

            PDFPresentationMode.prototype = {
                /**
                 * Request the browser to enter fullscreen mode.
                 * @returns {boolean} Indicating if the request was successful.
                 */
                request: function PDFPresentationMode_request() {
                    if (this.switchInProgress || this.active ||
                        !this.viewer.hasChildNodes()) {
                        return false;
                    }
                    this._addFullscreenChangeListeners();
                    this._setSwitchInProgress();
                    this._notifyStateChange();

                    if (this.container.requestFullscreen) {
                        this.container.requestFullscreen();
                    } else if (this.container.mozRequestFullScreen) {
                        this.container.mozRequestFullScreen();
                    } else if (this.container.webkitRequestFullscreen) {
                        this.container.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
                    } else if (this.container.msRequestFullscreen) {
                        this.container.msRequestFullscreen();
                    } else {
                        return false;
                    }

                    this.args = {
                        page: this.pdfViewer.currentPageNumber,
                        previousScale: this.pdfViewer.currentScaleValue,
                    };

                    return true;
                },

                /**
                 * Switches page when the user scrolls (using a scroll wheel or a touchpad)
                 * with large enough motion, to prevent accidental page switches.
                 * @param {number} delta - The delta value from the mouse event.
                 */
                mouseScroll: function PDFPresentationMode_mouseScroll(delta) {
                    if (!this.active) {
                        return;
                    }
                    let MOUSE_SCROLL_COOLDOWN_TIME = 50;
                    let PAGE_SWITCH_THRESHOLD = 120;
                    let PageSwitchDirection = {
                        UP: -1,
                        DOWN: 1
                    };

                    let currentTime = (new Date()).getTime();
                    let storedTime = this.mouseScrollTimeStamp;

                    // If we've already switched page, avoid accidentally switching again.
                    if (currentTime > storedTime &&
                        currentTime - storedTime < MOUSE_SCROLL_COOLDOWN_TIME) {
                        return;
                    }
                    // If the scroll direction changed, reset the accumulated scroll delta.
                    if ((this.mouseScrollDelta > 0 && delta < 0) ||
                        (this.mouseScrollDelta < 0 && delta > 0)) {
                        this._resetMouseScrollState();
                    }
                    this.mouseScrollDelta += delta;

                    if (Math.abs(this.mouseScrollDelta) >= PAGE_SWITCH_THRESHOLD) {
                        let pageSwitchDirection = (this.mouseScrollDelta > 0) ?
                            PageSwitchDirection.UP : PageSwitchDirection.DOWN;
                        let page = this.pdfViewer.currentPageNumber;
                        this._resetMouseScrollState();

                        // If we're at the first/last page, we don't need to do anything.
                        if ((page === 1 && pageSwitchDirection === PageSwitchDirection.UP) ||
                            (page === this.pdfViewer.pagesCount &&
                                pageSwitchDirection === PageSwitchDirection.DOWN)) {
                            return;
                        }
                        this.pdfViewer.currentPageNumber = (page + pageSwitchDirection);
                        this.mouseScrollTimeStamp = currentTime;
                    }
                },

                get isFullscreen() {
                    return !!(document.fullscreenElement ||
                        document.mozFullScreen ||
                        document.webkitIsFullScreen ||
                        document.msFullscreenElement);
                },

                /**
                 * @private
                 */
                _notifyStateChange: function PDFPresentationMode_notifyStateChange() {
                    let event = document.createEvent('CustomEvent');
                    event.initCustomEvent('presentationmodechanged', true, true, {
                        active: this.active,
                        switchInProgress: !!this.switchInProgress
                    });
                    window.dispatchEvent(event);
                },

                /**
                 * Used to initialize a timeout when requesting Presentation Mode,
                 * i.e. when the browser is requested to enter fullscreen mode.
                 * This timeout is used to prevent the current page from being scrolled
                 * partially, or completely, out of view when entering Presentation Mode.
                 * NOTE: This issue seems limited to certain zoom levels (e.g. page-width).
                 * @private
                 */
                _setSwitchInProgress: function PDFPresentationMode_setSwitchInProgress() {
                    if (this.switchInProgress) {
                        clearTimeout(this.switchInProgress);
                    }
                    this.switchInProgress = setTimeout(function switchInProgressTimeout() {
                        this._removeFullscreenChangeListeners();
                        delete this.switchInProgress;
                        this._notifyStateChange();
                    }.bind(this), DELAY_BEFORE_RESETTING_SWITCH_IN_PROGRESS);
                },

                /**
                 * @private
                 */
                _resetSwitchInProgress:
                    function PDFPresentationMode_resetSwitchInProgress() {
                        if (this.switchInProgress) {
                            clearTimeout(this.switchInProgress);
                            delete this.switchInProgress;
                        }
                    },

                /**
                 * @private
                 */
                _enter: function PDFPresentationMode_enter() {
                    this.active = true;
                    this._resetSwitchInProgress();
                    this._notifyStateChange();
                    this.container.classList.add(ACTIVE_SELECTOR);

                    // Ensure that the correct page is scrolled into view when entering
                    // Presentation Mode, by waiting until fullscreen mode in enabled.
                    setTimeout(function enterPresentationModeTimeout() {
                        this.pdfViewer.currentPageNumber = this.args.page;
                        this.pdfViewer.currentScaleValue = 'page-fit';
                    }.bind(this), 0);

                    this._addWindowListeners();
                    this._showControls();
                    this.contextMenuOpen = false;
                    this.container.setAttribute('contextmenu', 'viewerContextMenu');

                    // Text selection is disabled in Presentation Mode, thus it's not possible
                    // for the user to deselect text that is selected (e.g. with "Select all")
                    // when entering Presentation Mode, hence we remove any active selection.
                    window.getSelection().removeAllRanges();
                },

                /**
                 * @private
                 */
                _exit: function PDFPresentationMode_exit() {
                    let page = this.pdfViewer.currentPageNumber;
                    this.container.classList.remove(ACTIVE_SELECTOR);

                    // Ensure that the correct page is scrolled into view when exiting
                    // Presentation Mode, by waiting until fullscreen mode is disabled.
                    setTimeout(function exitPresentationModeTimeout() {
                        this.active = false;
                        this._removeFullscreenChangeListeners();
                        this._notifyStateChange();

                        this.pdfViewer.currentScaleValue = this.args.previousScale;
                        this.pdfViewer.currentPageNumber = page;
                        this.args = null;
                    }.bind(this), 0);

                    this._removeWindowListeners();
                    this._hideControls();
                    this._resetMouseScrollState();
                    this.container.removeAttribute('contextmenu');
                    this.contextMenuOpen = false;
                },

                /**
                 * @private
                 */
                _mouseDown: function PDFPresentationMode_mouseDown(evt) {
                    if (this.contextMenuOpen) {
                        this.contextMenuOpen = false;
                        evt.preventDefault();
                        return;
                    }
                    if (evt.button === 0) {
                        // Enable clicking of links in presentation mode. Please note:
                        // Only links pointing to destinations in the current PDF document work.
                        let isInternalLink = (evt.target.href &&
                            evt.target.classList.contains('internalLink'));
                        if (!isInternalLink) {
                            // Unless an internal link was clicked, advance one page.
                            evt.preventDefault();
                            this.pdfViewer.currentPageNumber += (evt.shiftKey ? -1 : 1);
                        }
                    }
                },

                /**
                 * @private
                 */
                _contextMenu: function PDFPresentationMode_contextMenu() {
                    this.contextMenuOpen = true;
                },

                /**
                 * @private
                 */
                _showControls: function PDFPresentationMode_showControls() {
                    if (this.controlsTimeout) {
                        clearTimeout(this.controlsTimeout);
                    } else {
                        this.container.classList.add(CONTROLS_SELECTOR);
                    }
                    this.controlsTimeout = setTimeout(function showControlsTimeout() {
                        this.container.classList.remove(CONTROLS_SELECTOR);
                        delete this.controlsTimeout;
                    }.bind(this), DELAY_BEFORE_HIDING_CONTROLS);
                },

                /**
                 * @private
                 */
                _hideControls: function PDFPresentationMode_hideControls() {
                    if (!this.controlsTimeout) {
                        return;
                    }
                    clearTimeout(this.controlsTimeout);
                    this.container.classList.remove(CONTROLS_SELECTOR);
                    delete this.controlsTimeout;
                },

                /**
                 * Resets the properties used for tracking mouse scrolling events.
                 * @private
                 */
                _resetMouseScrollState:
                    function PDFPresentationMode_resetMouseScrollState() {
                        this.mouseScrollTimeStamp = 0;
                        this.mouseScrollDelta = 0;
                    },

                /**
                 * @private
                 */
                _addWindowListeners: function PDFPresentationMode_addWindowListeners() {
                    this.showControlsBind = this._showControls.bind(this);
                    this.mouseDownBind = this._mouseDown.bind(this);
                    this.resetMouseScrollStateBind = this._resetMouseScrollState.bind(this);
                    this.contextMenuBind = this._contextMenu.bind(this);

                    window.addEventListener('mousemove', this.showControlsBind);
                    window.addEventListener('mousedown', this.mouseDownBind);
                    window.addEventListener('keydown', this.resetMouseScrollStateBind);
                    window.addEventListener('contextmenu', this.contextMenuBind);
                },

                /**
                 * @private
                 */
                _removeWindowListeners:
                    function PDFPresentationMode_removeWindowListeners() {
                        window.removeEventListener('mousemove', this.showControlsBind);
                        window.removeEventListener('mousedown', this.mouseDownBind);
                        window.removeEventListener('keydown', this.resetMouseScrollStateBind);
                        window.removeEventListener('contextmenu', this.contextMenuBind);

                        delete this.showControlsBind;
                        delete this.mouseDownBind;
                        delete this.resetMouseScrollStateBind;
                        delete this.contextMenuBind;
                    },

                /**
                 * @private
                 */
                _fullscreenChange: function PDFPresentationMode_fullscreenChange() {
                    if (this.isFullscreen) {
                        this._enter();
                    } else {
                        this._exit();
                    }
                },

                /**
                 * @private
                 */
                _addFullscreenChangeListeners:
                    function PDFPresentationMode_addFullscreenChangeListeners() {
                        this.fullscreenChangeBind = this._fullscreenChange.bind(this);

                        window.addEventListener('fullscreenchange', this.fullscreenChangeBind);
                        window.addEventListener('mozfullscreenchange', this.fullscreenChangeBind);
                        window.addEventListener('webkitfullscreenchange',
                            this.fullscreenChangeBind);
                        window.addEventListener('MSFullscreenChange', this.fullscreenChangeBind);
                    },

                /**
                 * @private
                 */
                _removeFullscreenChangeListeners:
                    function PDFPresentationMode_removeFullscreenChangeListeners() {
                        window.removeEventListener('fullscreenchange', this.fullscreenChangeBind);
                        window.removeEventListener('mozfullscreenchange',
                            this.fullscreenChangeBind);
                        window.removeEventListener('webkitfullscreenchange',
                            this.fullscreenChangeBind);
                        window.removeEventListener('MSFullscreenChange',
                            this.fullscreenChangeBind);

                        delete this.fullscreenChangeBind;
                    }
            };

            return PDFPresentationMode;
        })();

        exports.PDFPresentationMode = PDFPresentationMode;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFRenderingQueue = {}));
        }
    }(this, function (exports) {

        let CLEANUP_TIMEOUT = 30000;

        let RenderingStates = {
            INITIAL: 0,
            RUNNING: 1,
            PAUSED: 2,
            FINISHED: 3
        };

        /**
         * Controls rendering of the views for pages and thumbnails.
         * @class
         */
        let PDFRenderingQueue = (function PDFRenderingQueueClosure() {
            /**
             * @constructs
             */
            function PDFRenderingQueue() {
                this.pdfViewer = null;
                this.pdfThumbnailViewer = null;
                this.onIdle = null;
                this.isThumbnailViewEnabled = false;
            }

            PDFRenderingQueue.prototype = /** @lends PDFRenderingQueue.prototype */ {
                /**
                 * @param {PDFViewer} pdfViewer
                 */
                setViewer: function PDFRenderingQueue_setViewer(pdfViewer) {
                    this.pdfViewer = pdfViewer;
                },

                /**
                 * @param {PDFThumbnailViewer} pdfThumbnailViewer
                 */
                setThumbnailViewer:
                    function PDFRenderingQueue_setThumbnailViewer(pdfThumbnailViewer) {
                        this.pdfThumbnailViewer = pdfThumbnailViewer;
                    },

                /**
                 * @param {IRenderableView} view
                 * @returns {boolean}
                 */
                isHighestPriority: function PDFRenderingQueue_isHighestPriority(view) {
                    return this.highestPriorityPage === view.renderingId;
                },

                renderHighestPriority: function
                    PDFRenderingQueue_renderHighestPriority(currentlyVisiblePages) {
                    if (this.idleTimeout) {
                        clearTimeout(this.idleTimeout);
                        this.idleTimeout = null;
                    }

                    // Pages have a higher priority than thumbnails, so check them first.
                    if (this.pdfViewer.forceRendering(currentlyVisiblePages)) {
                        return;
                    }
                    // No pages needed rendering so check thumbnails.
                    if (this.pdfThumbnailViewer && this.isThumbnailViewEnabled) {
                        if (this.pdfThumbnailViewer.forceRendering()) {
                            return;
                        }
                    }

                    if (this.onIdle) {
                        this.idleTimeout = setTimeout(this.onIdle.bind(this), CLEANUP_TIMEOUT);
                    }
                },

                getHighestPriority: function
                    PDFRenderingQueue_getHighestPriority(visible, views, scrolledDown) {
                    // The state has changed figure out which page has the highest priority to
                    // render next (if any).
                    // Priority:
                    // 1 visible pages
                    // 2 if last scrolled down page after the visible pages
                    // 2 if last scrolled up page before the visible pages
                    let visibleViews = visible.views;

                    let numVisible = visibleViews.length;
                    if (numVisible === 0) {
                        return false;
                    }
                    for (let i = 0; i < numVisible; ++i) {
                        let view = visibleViews[i].view;
                        if (!this.isViewFinished(view)) {
                            return view;
                        }
                    }

                    // All the visible views have rendered, try to render next/previous pages.
                    if (scrolledDown) {
                        let nextPageIndex = visible.last.id;
                        // ID's start at 1 so no need to add 1.
                        if (views[nextPageIndex] &&
                            !this.isViewFinished(views[nextPageIndex])) {
                            return views[nextPageIndex];
                        }
                    } else {
                        let previousPageIndex = visible.first.id - 2;
                        if (views[previousPageIndex] &&
                            !this.isViewFinished(views[previousPageIndex])) {
                            return views[previousPageIndex];
                        }
                    }
                    // Everything that needs to be rendered has been.
                    return null;
                },

                /**
                 * @param {IRenderableView} view
                 * @returns {boolean}
                 */
                isViewFinished: function PDFRenderingQueue_isViewFinished(view) {
                    return view.renderingState === RenderingStates.FINISHED;
                },

                /**
                 * Render a page or thumbnail view. This calls the appropriate function
                 * based on the views state. If the view is already rendered it will return
                 * false.
                 * @param {IRenderableView} view
                 */
                renderView: function PDFRenderingQueue_renderView(view) {
                    let state = view.renderingState;
                    switch (state) {
                        case RenderingStates.FINISHED:
                            return false;
                        case RenderingStates.PAUSED:
                            this.highestPriorityPage = view.renderingId;
                            view.resume();
                            break;
                        case RenderingStates.RUNNING:
                            this.highestPriorityPage = view.renderingId;
                            break;
                        case RenderingStates.INITIAL:
                            this.highestPriorityPage = view.renderingId;
                            let continueRendering = function () {
                                this.renderHighestPriority();
                            }.bind(this);
                            view.draw().then(continueRendering, continueRendering);
                            break;
                    }
                    return true;
                },
            };

            return PDFRenderingQueue;
        })();

        exports.RenderingStates = RenderingStates;
        exports.PDFRenderingQueue = PDFRenderingQueue;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPreferences = {}));
        }
    }(this, function (exports) {


        let DEFAULT_PREFERENCES = {
            showPreviousViewOnLoad: true,
            defaultZoomValue: '',
            sidebarViewOnLoad: 0,
            enableHandToolOnLoad: false,
            enableWebGL: false,
            pdfBugEnabled: false,
            disableRange: false,
            disableStream: false,
            disableAutoFetch: false,
            disableFontFace: false,
            disableTextLayer: false,
            useOnlyCssZoom: false,
            externalLinkTarget: 0,
        };


        /**
         * Preferences - Utility for storing persistent settings.
         *   Used for settings that should be applied to all opened documents,
         *   or every time the viewer is loaded.
         */
        let Preferences = {
            prefs: Object.create(DEFAULT_PREFERENCES),
            isInitializedPromiseResolved: false,
            initializedPromise: null,

            /**
             * Initialize and fetch the current preference values from storage.
             * @return {Promise} A promise that is resolved when the preferences
             *                   have been initialized.
             */
            initialize: function preferencesInitialize() {
                return this.initializedPromise =
                    this._readFromStorage(DEFAULT_PREFERENCES).then(function (prefObj) {
                        this.isInitializedPromiseResolved = true;
                        if (prefObj) {
                            this.prefs = prefObj;
                        }
                    }.bind(this));
            },

            /**
             * Stub function for writing preferences to storage.
             * NOTE: This should be overridden by a build-specific function defined below.
             * @param {Object} prefObj The preferences that should be written to storage.
             * @return {Promise} A promise that is resolved when the preference values
             *                   have been written.
             */
            _writeToStorage: function preferences_writeToStorage(prefObj) {
                return Promise.resolve();
            },

            /**
             * Stub function for reading preferences from storage.
             * NOTE: This should be overridden by a build-specific function defined below.
             * @param {Object} prefObj The preferences that should be read from storage.
             * @return {Promise} A promise that is resolved with an {Object} containing
             *                   the preferences that have been read.
             */
            _readFromStorage: function preferences_readFromStorage(prefObj) {
                return Promise.resolve();
            },

            /**
             * Reset the preferences to their default values and update storage.
             * @return {Promise} A promise that is resolved when the preference values
             *                   have been reset.
             */
            reset: function preferencesReset() {
                return this.initializedPromise.then(function () {
                    this.prefs = Object.create(DEFAULT_PREFERENCES);
                    return this._writeToStorage(DEFAULT_PREFERENCES);
                }.bind(this));
            },

            /**
             * Replace the current preference values with the ones from storage.
             * @return {Promise} A promise that is resolved when the preference values
             *                   have been updated.
             */
            reload: function preferencesReload() {
                return this.initializedPromise.then(function () {
                    this._readFromStorage(DEFAULT_PREFERENCES).then(function (prefObj) {
                        if (prefObj) {
                            this.prefs = prefObj;
                        }
                    }.bind(this));
                }.bind(this));
            },

            /**
             * Set the value of a preference.
             * @param {string} name The name of the preference that should be changed.
             * @param {boolean|number|string} value The new value of the preference.
             * @return {Promise} A promise that is resolved when the value has been set,
             *                   provided that the preference exists and the types match.
             */
            set: function preferencesSet(name, value) {
                return this.initializedPromise.then(function () {
                    if (DEFAULT_PREFERENCES[name] === undefined) {
                        throw new Error('preferencesSet: \'' + name + '\' is undefined.');
                    } else if (value === undefined) {
                        throw new Error('preferencesSet: no value is specified.');
                    }
                    let valueType = typeof value;
                    let defaultType = typeof DEFAULT_PREFERENCES[name];

                    if (valueType !== defaultType) {
                        if (valueType === 'number' && defaultType === 'string') {
                            value = value.toString();
                        } else {
                            throw new Error('Preferences_set: \'' + value + '\' is a \"' +
                                valueType + '\", expected \"' + defaultType + '\".');
                        }
                    } else {
                        if (valueType === 'number' && (value | 0) !== value) {
                            throw new Error('Preferences_set: \'' + value +
                                '\' must be an \"integer\".');
                        }
                    }
                    this.prefs[name] = value;
                    return this._writeToStorage(this.prefs);
                }.bind(this));
            },

            /**
             * Get the value of a preference.
             * @param {string} name The name of the preference whose value is requested.
             * @return {Promise} A promise that is resolved with a {boolean|number|string}
             *                   containing the value of the preference.
             */
            get: function preferencesGet(name) {
                return this.initializedPromise.then(function () {
                    let defaultValue = DEFAULT_PREFERENCES[name];

                    if (defaultValue === undefined) {
                        throw new Error('preferencesGet: \'' + name + '\' is undefined.');
                    } else {
                        let prefValue = this.prefs[name];

                        if (prefValue !== undefined) {
                            return prefValue;
                        }
                    }
                    return defaultValue;
                }.bind(this));
            }
        };


        Preferences._writeToStorage = function (prefObj) {
            return new Promise(function (resolve) {
                localStorage.setItem('pdfjs.preferences', JSON.stringify(prefObj));
                resolve();
            });
        };

        Preferences._readFromStorage = function (prefObj) {
            return new Promise(function (resolve) {
                let readPrefs = JSON.parse(localStorage.getItem('pdfjs.preferences'));
                resolve(readPrefs);
            });
        };

        exports.Preferences = Preferences;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebViewHistory = {}));
        }
    }(this, function (exports) {

        let DEFAULT_VIEW_HISTORY_CACHE_SIZE = 20;

        /**
         * View History - This is a utility for saving various view parameters for
         *                recently opened files.
         *
         * The way that the view parameters are stored depends on how PDF.js is built,
         * for 'gulp <flag>' the following cases exist:
         *  - FIREFOX or MOZCENTRAL - uses sessionStorage.
         *  - GENERIC or CHROME     - uses localStorage, if it is available.
         */
        let ViewHistory = (function ViewHistoryClosure() {
            function ViewHistory(fingerprint, cacheSize) {
                this.fingerprint = fingerprint;
                this.cacheSize = cacheSize || DEFAULT_VIEW_HISTORY_CACHE_SIZE;
                this.isInitializedPromiseResolved = false;
                this.initializedPromise =
                    this._readFromStorage().then(function (databaseStr) {
                        this.isInitializedPromiseResolved = true;

                        let database = JSON.parse(databaseStr || '{}');
                        if (!('files' in database)) {
                            database.files = [];
                        }
                        if (database.files.length >= this.cacheSize) {
                            database.files.shift();
                        }
                        let index;
                        for (let i = 0, length = database.files.length; i < length; i++) {
                            let branch = database.files[i];
                            if (branch.fingerprint === this.fingerprint) {
                                index = i;
                                break;
                            }
                        }
                        if (typeof index !== 'number') {
                            index = database.files.push({fingerprint: this.fingerprint}) - 1;
                        }
                        this.file = database.files[index];
                        this.database = database;
                    }.bind(this));
            }

            ViewHistory.prototype = {
                _writeToStorage: function ViewHistory_writeToStorage() {
                    return new Promise(function (resolve) {
                        let databaseStr = JSON.stringify(this.database);


                        localStorage.setItem('database', databaseStr);
                        resolve();
                    }.bind(this));
                },

                _readFromStorage: function ViewHistory_readFromStorage() {
                    return new Promise(function (resolve) {

                        resolve(localStorage.getItem('database'));
                    });
                },

                set: function ViewHistory_set(name, val) {
                    if (!this.isInitializedPromiseResolved) {
                        return;
                    }
                    this.file[name] = val;
                    return this._writeToStorage();
                },

                setMultiple: function ViewHistory_setMultiple(properties) {
                    if (!this.isInitializedPromiseResolved) {
                        return;
                    }
                    for (let name in properties) {
                        this.file[name] = properties[name];
                    }
                    return this._writeToStorage();
                },

                get: function ViewHistory_get(name, defaultValue) {
                    if (!this.isInitializedPromiseResolved) {
                        return defaultValue;
                    }
                    return this.file[name] || defaultValue;
                }
            };

            return ViewHistory;
        })();

        exports.ViewHistory = ViewHistory;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebFirefoxCom = {}), root.pdfjsWebPreferences,
                root.pdfjsWebPDFJS);
        }
    }(this, function (exports, preferences, pdfjsLib) {
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFSidebar = {}), root.pdfjsWebPDFRenderingQueue);
        }
    }(this, function (exports, pdfRenderingQueue) {

        let RenderingStates = pdfRenderingQueue.RenderingStates;

        let SidebarView = {
            NONE: 0,
            THUMBS: 1,
        };

        /**
         * @typedef {Object} PDFSidebarOptions
         * @property {PDFViewer} pdfViewer - The document viewer.
         * @property {PDFThumbnailViewer} pdfThumbnailViewer - The thumbnail viewer.
         * @property {HTMLDivElement} mainContainer - The main container
         *   (in which the viewer element is placed).
         * @property {HTMLDivElement} outerContainer - The outer container
         *   (encasing both the viewer and sidebar elements).
         * @property {HTMLButtonElement} toggleButton - The button used for
         *   opening/closing the sidebar.
         * @property {HTMLButtonElement} thumbnailButton - The button used to show
         *   the thumbnail view.
         * @property {HTMLDivElement} thumbnailView - The container in which
         *   the thumbnails are placed.
         */

        /**
         * @class
         */
        let PDFSidebar = (function PDFSidebarClosure() {
            /**
             * @constructs PDFSidebar
             * @param {PDFSidebarOptions} options
             */
            function PDFSidebar(options) {
                this.isOpen = false;
                this.active = SidebarView.THUMBS;
                this.isInitialViewSet = false;

                /**
                 * Callback used when the sidebar has been opened/closed, to ensure that
                 * the viewers (PDFViewer/PDFThumbnailViewer) are updated correctly.
                 */
                this.onToggled = null;

                this.pdfViewer = options.pdfViewer;
                this.pdfThumbnailViewer = options.pdfThumbnailViewer;

                this.mainContainer = options.mainContainer;
                this.outerContainer = options.outerContainer;
                this.toggleButton = options.toggleButton;

                this.thumbnailButton = options.thumbnailButton;

                this.thumbnailView = options.thumbnailView;

                this._addEventListeners();
            }

            PDFSidebar.prototype = {
                reset: function PDFSidebar_reset() {
                    this.isInitialViewSet = false;

                    this.close();
                    this.switchView(SidebarView.THUMBS);
                },

                /**
                 * @returns {number} One of the values in {SidebarView}.
                 */
                get visibleView() {
                    return (this.isOpen ? this.active : SidebarView.NONE);
                },

                get isThumbnailViewVisible() {
                    return (this.isOpen && this.active === SidebarView.THUMBS);
                },

                /**
                 * @param {number} view - The sidebar view that should become visible,
                 *                        must be one of the values in {SidebarView}.
                 */
                setInitialView: function PDFSidebar_setInitialView(view) {
                    if (this.isInitialViewSet) {
                        return;
                    }
                    this.isInitialViewSet = true;

                    if (this.isOpen && view === SidebarView.NONE) {
                        this._dispatchEvent();
                        // If the user has already manually opened the sidebar,
                        // immediately closing it would be bad UX.
                        return;
                    }
                    let isViewPreserved = (view === this.visibleView);
                    this.switchView(view, /* forceOpen */ true);

                    if (isViewPreserved) {
                        // Prevent dispatching two back-to-back `sidebarviewchanged` events,
                        // since `this.switchView` dispatched the event if the view changed.
                        this._dispatchEvent();
                    }
                },

                /**
                 * @param {number} view - The sidebar view that should be switched to,
                 *                        must be one of the values in {SidebarView}.
                 * @param {boolean} forceOpen - (optional) Ensure that the sidebar is open.
                 *                              The default value is false.
                 */
                switchView: function PDFSidebar_switchView(view, forceOpen) {
                    if (view === SidebarView.NONE) {
                        this.close();
                        return;
                    }
                    let isViewChanged = (view !== this.active);
                    let shouldForceRendering = false;

                    switch (view) {
                        case SidebarView.THUMBS:
                            this.thumbnailButton.classList.add('toggled');

                            this.thumbnailView.classList.remove('hidden');

                            if (this.isOpen && isViewChanged) {
                                this._updateThumbnailViewer();
                                shouldForceRendering = true;
                            }
                            break;
                        default:
                            console.error('PDFSidebar_switchView: "' + view +
                                '" is an unsupported value.');
                            return;
                    }
                    // Update the active view *after* it has been validated above,
                    // in order to prevent setting it to an invalid state.
                    this.active = view | 0;

                    if (forceOpen && !this.isOpen) {
                        this.open();
                        // NOTE: `this.open` will trigger rendering, and dispatch the event.
                        return;
                    }
                    if (shouldForceRendering) {
                        this._forceRendering();
                    }
                    if (isViewChanged) {
                        this._dispatchEvent();
                    }
                },

                open: function PDFSidebar_open() {
                    if (this.isOpen) {
                        return;
                    }
                    this.isOpen = true;
                    this.toggleButton.classList.add('toggled');

                    this.outerContainer.classList.add('sidebarMoving');
                    this.outerContainer.classList.add('sidebarOpen');

                    if (this.active === SidebarView.THUMBS) {
                        this._updateThumbnailViewer();
                    }
                    this._forceRendering();
                    this._dispatchEvent();
                },

                close: function PDFSidebar_close() {
                    if (!this.isOpen) {
                        return;
                    }
                    this.isOpen = false;
                    this.toggleButton.classList.remove('toggled');

                    this.outerContainer.classList.add('sidebarMoving');
                    this.outerContainer.classList.remove('sidebarOpen');

                    this._forceRendering();
                    this._dispatchEvent();
                },

                toggle: function PDFSidebar_toggle() {
                    if (this.isOpen) {
                        this.close();
                    } else {
                        this.open();
                    }
                },

                /**
                 * @private
                 */
                _dispatchEvent: function PDFSidebar_dispatchEvent() {
                    let event = document.createEvent('CustomEvent');
                    event.initCustomEvent('sidebarviewchanged', true, true, {
                        view: this.visibleView,
                    });
                    this.outerContainer.dispatchEvent(event);
                },

                /**
                 * @private
                 */
                _forceRendering: function PDFSidebar_forceRendering() {
                    if (this.onToggled) {
                        this.onToggled();
                    } else { // Fallback
                        this.pdfViewer.forceRendering();
                        this.pdfThumbnailViewer.forceRendering();
                    }
                },

                /**
                 * @private
                 */
                _updateThumbnailViewer: function PDFSidebar_updateThumbnailViewer() {
                    let pdfViewer = this.pdfViewer;
                    let thumbnailViewer = this.pdfThumbnailViewer;

                    // Use the rendered pages to set the corresponding thumbnail images.
                    let pagesCount = pdfViewer.pagesCount;
                    for (let pageIndex = 0; pageIndex < pagesCount; pageIndex++) {
                        let pageView = pdfViewer.getPageView(pageIndex);
                        if (pageView && pageView.renderingState === RenderingStates.FINISHED) {
                            let thumbnailView = thumbnailViewer.getThumbnail(pageIndex);
                            thumbnailView.setImage(pageView);
                        }
                    }
                    thumbnailViewer.scrollThumbnailIntoView(pdfViewer.currentPageNumber);
                },

                /**
                 * @private
                 */
                _addEventListeners: function PDFSidebar_addEventListeners() {
                    let self = this;

                    self.mainContainer.addEventListener('transitionend', function (evt) {
                        if (evt.target === /* mainContainer */ this) {
                            self.outerContainer.classList.remove('sidebarMoving');
                        }
                    });

                    // Buttons for switching views.
                    self.thumbnailButton.addEventListener('click', function () {
                        self.switchView(SidebarView.THUMBS);
                    });

                    // Update the thumbnailViewer, if visible, when exiting presentation mode.
                    window.addEventListener('presentationmodechanged', function (evt) {
                        if (!evt.detail.active && !evt.detail.switchInProgress &&
                            self.isThumbnailViewVisible) {
                            self._updateThumbnailViewer();
                        }
                    });
                },
            };

            return PDFSidebar;
        })();

        exports.SidebarView = SidebarView;
        exports.PDFSidebar = PDFSidebar;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebTextLayerBuilder = {}), root.pdfjsWebPDFJS);
        }
    }(this, function (exports, pdfjsLib) {

        /**
         * @typedef {Object} TextLayerBuilderOptions
         * @property {HTMLDivElement} textLayerDiv - The text layer container.
         * @property {number} pageIndex - The page index.
         * @property {PageViewport} viewport - The viewport of the text layer.
         */

        /**
         * TextLayerBuilder provides text-selection functionality for the PDF.
         * It does this by creating overlay divs over the PDF text. These divs
         * contain text that matches the PDF text they are overlaying. This object
         * also provides a way to highlight text that is being searched for.
         * @class
         */
        let TextLayerBuilder = (function TextLayerBuilderClosure() {
            function TextLayerBuilder(options) {
                this.textLayerDiv = options.textLayerDiv;
                this.renderingDone = false;
                this.divContentDone = false;
                this.pageIdx = options.pageIndex;
                this.pageNumber = this.pageIdx + 1;
                this.matches = [];
                this.viewport = options.viewport;
                this.textDivs = [];
                this.findController = options.findController || null;
                this.textLayerRenderTask = null;
                this._bindMouse();
            }

            TextLayerBuilder.prototype = {
                _finishRendering: function TextLayerBuilder_finishRendering() {
                    this.renderingDone = true;

                    let endOfContent = document.createElement('div');
                    endOfContent.className = 'endOfContent';
                    this.textLayerDiv.appendChild(endOfContent);

                    let event = document.createEvent('CustomEvent');
                    event.initCustomEvent('textlayerrendered', true, true, {
                        pageNumber: this.pageNumber
                    });
                    this.textLayerDiv.dispatchEvent(event);
                },

                /**
                 * Renders the text layer.
                 * @param {number} timeout (optional) if specified, the rendering waits
                 *   for specified amount of ms.
                 */
                render: function TextLayerBuilder_render(timeout) {
                    if (!this.divContentDone || this.renderingDone) {
                        return;
                    }

                    if (this.textLayerRenderTask) {
                        this.textLayerRenderTask.cancel();
                        this.textLayerRenderTask = null;
                    }

                    this.textDivs = [];
                    let textLayerFrag = document.createDocumentFragment();
                    this.textLayerRenderTask = pdfjsLib.renderTextLayer({
                        textContent: this.textContent,
                        container: textLayerFrag,
                        viewport: this.viewport,
                        textDivs: this.textDivs,
                        timeout: timeout
                    });
                    this.textLayerRenderTask.promise.then(function () {
                        this.textLayerDiv.appendChild(textLayerFrag);
                        this._finishRendering();
                    }.bind(this), function (reason) {
                        // canceled or failed to render text layer -- skipping errors
                    });
                },

                setTextContent: function TextLayerBuilder_setTextContent(textContent) {
                    if (this.textLayerRenderTask) {
                        this.textLayerRenderTask.cancel();
                        this.textLayerRenderTask = null;
                    }
                    this.textContent = textContent;
                    this.divContentDone = true;
                },

                /**
                 * Fixes text selection: adds additional div where mouse was clicked.
                 * This reduces flickering of the content if mouse slowly dragged down/up.
                 * @private
                 */
                _bindMouse: function TextLayerBuilder_bindMouse() {
                    let div = this.textLayerDiv;
                    div.addEventListener('mousedown', function (e) {
                        let end = div.querySelector('.endOfContent');
                        if (!end) {
                            return;
                        }
                        // On non-Firefox browsers, the selection will feel better if the height
                        // of the endOfContent div will be adjusted to start at mouse click
                        // location -- this will avoid flickering when selections moves up.
                        // However it does not work when selection started on empty space.
                        let adjustTop = e.target !== div;
                        adjustTop = adjustTop && window.getComputedStyle(end).getPropertyValue('-moz-user-select') !== 'none';
                        if (adjustTop) {
                            let divBounds = div.getBoundingClientRect();
                            let r = Math.max(0, (e.pageY - divBounds.top) / divBounds.height);
                            end.style.top = (r * 100).toFixed(2) + '%';
                        }
                        end.classList.add('active');
                    });
                    div.addEventListener('mouseup', function (e) {
                        let end = div.querySelector('.endOfContent');
                        if (!end) {
                            return;
                        }
                        end.style.top = '';
                        end.classList.remove('active');
                    });
                },
            };
            return TextLayerBuilder;
        })();

        /**
         * @constructor
         * @implements IPDFTextLayerFactory
         */
        function DefaultTextLayerFactory() {
        }

        DefaultTextLayerFactory.prototype = {
            /**
             * @param {HTMLDivElement} textLayerDiv
             * @param {number} pageIndex
             * @param {PageViewport} viewport
             * @returns {TextLayerBuilder}
             */
            createTextLayerBuilder: function (textLayerDiv, pageIndex, viewport) {
                return new TextLayerBuilder({
                    textLayerDiv: textLayerDiv,
                    pageIndex: pageIndex,
                    viewport: viewport
                });
            }
        };

        exports.TextLayerBuilder = TextLayerBuilder;
        exports.DefaultTextLayerFactory = DefaultTextLayerFactory;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebUIUtils = {}), root.pdfjsWebPDFJS);
        }
    }(this, function (exports, pdfjsLib) {

        let CSS_UNITS = 96.0 / 72.0;
        let DEFAULT_SCALE_VALUE = 'auto';
        let DEFAULT_SCALE = 1.0;
        let UNKNOWN_SCALE = 0;
        let MAX_AUTO_SCALE = 1.25;
        let SCROLLBAR_PADDING = 40;
        let VERTICAL_PADDING = 5;

        let mozL10n = document.mozL10n || document.webL10n;

        let PDFJS = pdfjsLib.PDFJS;

        /**
         * Disables fullscreen support, and by extension Presentation Mode,
         * in browsers which support the fullscreen API.
         * @let {boolean}
         */
        PDFJS.disableFullscreen = (PDFJS.disableFullscreen === undefined ?
            false : PDFJS.disableFullscreen);

        /**
         * Enables CSS only zooming.
         * @let {boolean}
         */
        PDFJS.useOnlyCssZoom = (PDFJS.useOnlyCssZoom === undefined ?
            false : PDFJS.useOnlyCssZoom);

        /**
         * The maximum supported canvas size in total pixels e.g. width * height.
         * The default value is 4096 * 4096. Use -1 for no limit.
         * @let {number}
         */
        PDFJS.maxCanvasPixels = (PDFJS.maxCanvasPixels === undefined ?
            16777216 : PDFJS.maxCanvasPixels);

        /**
         * Disables saving of the last position of the viewed PDF.
         * @let {boolean}
         */
        PDFJS.disableHistory = (PDFJS.disableHistory === undefined ?
            false : PDFJS.disableHistory);

        /**
         * Disables creation of the text layer that used for text selection and search.
         * @let {boolean}
         */
        PDFJS.disableTextLayer = (PDFJS.disableTextLayer === undefined ?
            false : PDFJS.disableTextLayer);

        /**
         * Disables maintaining the current position in the document when zooming.
         */
        PDFJS.ignoreCurrentPositionOnZoom = (PDFJS.ignoreCurrentPositionOnZoom ===
        undefined ? false : PDFJS.ignoreCurrentPositionOnZoom);

        /**
         * Interface locale settings.
         * @let {string}
         */
        PDFJS.locale = (PDFJS.locale === undefined ? navigator.language : PDFJS.locale);

        /**
         * Returns scale factor for the canvas. It makes sense for the HiDPI displays.
         * @return {Object} The object with horizontal (sx) and vertical (sy)
         scales. The scaled property is set to false if scaling is
         not required, true otherwise.
         */
        function getOutputScale(ctx) {
            let devicePixelRatio = window.devicePixelRatio || 1;
            let backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                ctx.mozBackingStorePixelRatio ||
                ctx.msBackingStorePixelRatio ||
                ctx.oBackingStorePixelRatio ||
                ctx.backingStorePixelRatio || 1;
            let pixelRatio = devicePixelRatio / backingStoreRatio;
            return {
                sx: pixelRatio,
                sy: pixelRatio,
                scaled: pixelRatio !== 1
            };
        }

        /**
         * Scrolls specified element into view of its parent.
         * @param {Object} element - The element to be visible.
         * @param {Object} spot - An object with optional top and left properties,
         *   specifying the offset from the top left edge.
         * @param {boolean} skipOverflowHiddenElements - Ignore elements that have
         *   the CSS rule `overflow: hidden;` set. The default is false.
         */
        function scrollIntoView(element, spot, skipOverflowHiddenElements) {
            // Assuming offsetParent is available (it's not available when viewer is in
            // hidden iframe or object). We have to scroll: if the offsetParent is not set
            // producing the error. See also animationStartedClosure.
            let parent = element.offsetParent;
            if (!parent) {
                console.error('offsetParent is not set -- cannot scroll');
                return;
            }
            let checkOverflow = skipOverflowHiddenElements || false;
            let offsetY = element.offsetTop + element.clientTop;
            let offsetX = element.offsetLeft + element.clientLeft;
            while (parent.clientHeight === parent.scrollHeight ||
            (checkOverflow && getComputedStyle(parent).overflow === 'hidden')) {
                if (parent.dataset._scaleY) {
                    offsetY /= parent.dataset._scaleY;
                    offsetX /= parent.dataset._scaleX;
                }
                offsetY += parent.offsetTop;
                offsetX += parent.offsetLeft;
                parent = parent.offsetParent;
                if (!parent) {
                    return; // no need to scroll
                }
            }
            if (spot) {
                if (spot.top !== undefined) {
                    offsetY += spot.top;
                }
                if (spot.left !== undefined) {
                    offsetX += spot.left;
                    parent.scrollLeft = offsetX;
                }
            }
            parent.scrollTop = offsetY;
        }

        /**
         * Helper function to start monitoring the scroll event and converting them into
         * PDF.js friendly one: with scroll debounce and scroll direction.
         */
        function watchScroll(viewAreaElement, callback) {
            let debounceScroll = function debounceScroll(evt) {
                if (rAF) {
                    return;
                }
                // schedule an invocation of scroll for next animation frame.
                rAF = window.requestAnimationFrame(function viewAreaElementScrolled() {
                    rAF = null;

                    let currentY = viewAreaElement.scrollTop;
                    let lastY = state.lastY;
                    if (currentY !== lastY) {
                        state.down = currentY > lastY;
                    }
                    state.lastY = currentY;

                    callback(state);
                });
            };

            let state = {
                down: true,
                lastY: viewAreaElement.scrollTop,
                _eventHandler: debounceScroll
            };

            let rAF = null;
            viewAreaElement.addEventListener('scroll', debounceScroll, true);
            return state;
        }

        /**
         * Helper function to parse query string (e.g. ?param1=value&parm2=...).
         */
        function parseQueryString(query) {
            let parts = query.split('&');
            let params = {};
            for (let i = 0, ii = parts.length; i < ii; ++i) {
                let param = parts[i].split('=');
                let key = param[0].toLowerCase();
                let value = param.length > 1 ? param[1] : null;
                params[decodeURIComponent(key)] = decodeURIComponent(value);
            }
            return params;
        }

        /**
         * Use binary search to find the index of the first item in a given array which
         * passes a given condition. The items are expected to be sorted in the sense
         * that if the condition is true for one item in the array, then it is also true
         * for all following items.
         *
         * @returns {Number} Index of the first array element to pass the test,
         *                   or |items.length| if no such element exists.
         */
        function binarySearchFirstItem(items, condition) {
            let minIndex = 0;
            let maxIndex = items.length - 1;

            if (items.length === 0 || !condition(items[maxIndex])) {
                return items.length;
            }
            if (condition(items[minIndex])) {
                return minIndex;
            }

            while (minIndex < maxIndex) {
                let currentIndex = (minIndex + maxIndex) >> 1;
                let currentItem = items[currentIndex];
                if (condition(currentItem)) {
                    maxIndex = currentIndex;
                } else {
                    minIndex = currentIndex + 1;
                }
            }
            return minIndex; /* === maxIndex */
        }

        /**
         *  Approximates float number as a fraction using Farey sequence (max order
         *  of 8).
         *  @param {number} x - Positive float number.
         *  @returns {Array} Estimated fraction: the first array item is a numerator,
         *                   the second one is a denominator.
         */
        function approximateFraction(x) {
            // Fast paths for int numbers or their inversions.
            if (Math.floor(x) === x) {
                return [x, 1];
            }
            let xinv = 1 / x;
            let limit = 8;
            if (xinv > limit) {
                return [1, limit];
            } else if (Math.floor(xinv) === xinv) {
                return [1, xinv];
            }

            let x_ = x > 1 ? xinv : x;
            // a/b and c/d are neighbours in Farey sequence.
            let a = 0, b = 1, c = 1, d = 1;
            // Limiting search to order 8.
            while (true) {
                // Generating next term in sequence (order of q).
                let p = a + c, q = b + d;
                if (q > limit) {
                    break;
                }
                if (x_ <= p / q) {
                    c = p;
                    d = q;
                } else {
                    a = p;
                    b = q;
                }
            }
            // Select closest of the neighbours to x.
            if (x_ - a / b < c / d - x_) {
                return x_ === x ? [a, b] : [b, a];
            } else {
                return x_ === x ? [c, d] : [d, c];
            }
        }

        function roundToDivide(x, div) {
            let r = x % div;
            return r === 0 ? x : Math.round(x - r + div);
        }

        /**
         * Generic helper to find out what elements are visible within a scroll pane.
         */
        function getVisibleElements(scrollEl, views, sortByVisibility) {
            let top = scrollEl.scrollTop, bottom = top + scrollEl.clientHeight;
            let left = scrollEl.scrollLeft, right = left + scrollEl.clientWidth;

            function isElementBottomBelowViewTop(view) {
                let element = view.div;
                let elementBottom =
                    element.offsetTop + element.clientTop + element.clientHeight;
                return elementBottom > top;
            }

            let visible = [], view, element;
            let currentHeight, viewHeight, hiddenHeight, percentHeight;
            let currentWidth, viewWidth;
            let firstVisibleElementInd = (views.length === 0) ? 0 :
                binarySearchFirstItem(views, isElementBottomBelowViewTop);

            for (let i = firstVisibleElementInd, ii = views.length; i < ii; i++) {
                view = views[i];
                element = view.div;
                currentHeight = element.offsetTop + element.clientTop;
                viewHeight = element.clientHeight;

                if (currentHeight > bottom) {
                    break;
                }

                currentWidth = element.offsetLeft + element.clientLeft;
                viewWidth = element.clientWidth;
                if (currentWidth + viewWidth < left || currentWidth > right) {
                    continue;
                }
                hiddenHeight = Math.max(0, top - currentHeight) +
                    Math.max(0, currentHeight + viewHeight - bottom);
                percentHeight = ((viewHeight - hiddenHeight) * 100 / viewHeight) | 0;

                visible.push({
                    id: view.id,
                    x: currentWidth,
                    y: currentHeight,
                    view: view,
                    percent: percentHeight
                });
            }

            let first = visible[0];
            let last = visible[visible.length - 1];

            if (sortByVisibility) {
                visible.sort(function (a, b) {
                    let pc = a.percent - b.percent;
                    if (Math.abs(pc) > 0.001) {
                        return -pc;
                    }
                    return a.id - b.id; // ensure stability
                });
            }
            return {first: first, last: last, views: visible};
        }

        /**
         * Event handler to suppress context menu.
         */
        function noContextMenuHandler(e) {
            e.preventDefault();
        }

        /**
         * Returns the filename or guessed filename from the url (see issue 3455).
         * url {String} The original PDF location.
         * @return {String} Guessed PDF file name.
         */
        function getPDFFileNameFromURL(url) {
            let reURI = /^(?:([^:]+:)?\/\/[^\/]+)?([^?#]*)(\?[^#]*)?(#.*)?$/;
            //            SCHEME      HOST         1.PATH  2.QUERY   3.REF
            // Pattern to get last matching NAME.pdf
            let reFilename = /[^\/?#=]+\.pdf\b(?!.*\.pdf\b)/i;
            let splitURI = reURI.exec(url);
            let suggestedFilename = reFilename.exec(splitURI[1]) ||
                reFilename.exec(splitURI[2]) ||
                reFilename.exec(splitURI[3]);
            if (suggestedFilename) {
                suggestedFilename = suggestedFilename[0];
                if (suggestedFilename.indexOf('%') !== -1) {
                    // URL-encoded %2Fpath%2Fto%2Ffile.pdf should be file.pdf
                    try {
                        suggestedFilename =
                            reFilename.exec(decodeURIComponent(suggestedFilename))[0];
                    } catch (e) { // Possible (extremely rare) errors:
                        // URIError "Malformed URI", e.g. for "%AA.pdf"
                        // TypeError "null has no properties", e.g. for "%2F.pdf"
                    }
                }
            }
            return suggestedFilename || 'document.pdf';
        }

        exports.CSS_UNITS = CSS_UNITS;
        exports.DEFAULT_SCALE_VALUE = DEFAULT_SCALE_VALUE;
        exports.DEFAULT_SCALE = DEFAULT_SCALE;
        exports.UNKNOWN_SCALE = UNKNOWN_SCALE;
        exports.MAX_AUTO_SCALE = MAX_AUTO_SCALE;
        exports.SCROLLBAR_PADDING = SCROLLBAR_PADDING;
        exports.VERTICAL_PADDING = VERTICAL_PADDING;
        exports.mozL10n = mozL10n;
        exports.getPDFFileNameFromURL = getPDFFileNameFromURL;
        exports.noContextMenuHandler = noContextMenuHandler;
        exports.parseQueryString = parseQueryString;
        exports.getVisibleElements = getVisibleElements;
        exports.roundToDivide = roundToDivide;
        exports.approximateFraction = approximateFraction;
        exports.getOutputScale = getOutputScale;
        exports.scrollIntoView = scrollIntoView;
        exports.watchScroll = watchScroll;
        exports.binarySearchFirstItem = binarySearchFirstItem;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFDocumentProperties = {}), root.pdfjsWebUIUtils,
                root.pdfjsWebOverlayManager);
        }
    }(this, function (exports, uiUtils, overlayManager) {

        let getPDFFileNameFromURL = uiUtils.getPDFFileNameFromURL;
        let mozL10n = uiUtils.mozL10n;
        let OverlayManager = overlayManager.OverlayManager;

        /**
         * @typedef {Object} PDFDocumentPropertiesOptions
         * @property {string} overlayName - Name/identifier for the overlay.
         * @property {Object} fields - Names and elements of the overlay's fields.
         * @property {HTMLButtonElement} closeButton - Button for closing the overlay.
         */

        /**
         * @class
         */
        let PDFDocumentProperties = (function PDFDocumentPropertiesClosure() {
            /**
             * @constructs PDFDocumentProperties
             * @param {PDFDocumentPropertiesOptions} options
             */
            function PDFDocumentProperties(options) {
                this.fields = options.fields;
                this.overlayName = options.overlayName;
                this.container = options.container;

                this.rawFileSize = 0;
                this.url = null;
                this.pdfDocument = null;

                // Bind the event listener for the Close button.
                if (options.closeButton) {
                    options.closeButton.addEventListener('click', this.close.bind(this));
                }

                this.dataAvailablePromise = new Promise(function (resolve) {
                    this.resolveDataAvailable = resolve;
                }.bind(this));

                OverlayManager.register(this.overlayName, this.container,
                    this.close.bind(this));
            }

            PDFDocumentProperties.prototype = {
                /**
                 * Open the document properties overlay.
                 */
                open: function PDFDocumentProperties_open() {
                    Promise.all([OverlayManager.open(this.overlayName),
                        this.dataAvailablePromise]).then(function () {
                        this._getProperties();
                    }.bind(this));
                },

                /**
                 * Close the document properties overlay.
                 */
                close: function PDFDocumentProperties_close() {
                    OverlayManager.close(this.overlayName);
                },

                /**
                 * Set the file size of the PDF document. This method is used to
                 * update the file size in the document properties overlay once it
                 * is known so we do not have to wait until the entire file is loaded.
                 *
                 * @param {number} fileSize - The file size of the PDF document.
                 */
                setFileSize: function PDFDocumentProperties_setFileSize(fileSize) {
                    if (fileSize > 0) {
                        this.rawFileSize = fileSize;
                    }
                },

                /**
                 * Set a reference to the PDF document and the URL in order
                 * to populate the overlay fields with the document properties.
                 * Note that the overlay will contain no information if this method
                 * is not called.
                 *
                 * @param {Object} pdfDocument - A reference to the PDF document.
                 * @param {string} url - The URL of the document.
                 */
                setDocumentAndUrl:
                    function PDFDocumentProperties_setDocumentAndUrl(pdfDocument, url) {
                        this.pdfDocument = pdfDocument;
                        this.url = url;
                        this.resolveDataAvailable();
                    },

                /**
                 * @private
                 */
                _getProperties: function PDFDocumentProperties_getProperties() {
                    if (!OverlayManager.active) {
                        // If the dialog was closed before dataAvailablePromise was resolved,
                        // don't bother updating the properties.
                        return;
                    }
                    // Get the file size (if it hasn't already been set).
                    this.pdfDocument.getDownloadInfo().then(function (data) {
                        if (data.length === this.rawFileSize) {
                            return;
                        }
                        this.setFileSize(data.length);
                        this._updateUI(this.fields['fileSize'], this._parseFileSize());
                    }.bind(this));

                    // Get the document properties.
                    this.pdfDocument.getMetadata().then(function (data) {
                        let content = {
                            'fileName': getPDFFileNameFromURL(this.url),
                            'fileSize': this._parseFileSize(),
                            'title': data.info.Title,
                            'author': data.info.Author,
                            'subject': data.info.Subject,
                            'keywords': data.info.Keywords,
                            'creationDate': this._parseDate(data.info.CreationDate),
                            'modificationDate': this._parseDate(data.info.ModDate),
                            'creator': data.info.Creator,
                            'producer': data.info.Producer,
                            'version': data.info.PDFFormatVersion,
                            'pageCount': this.pdfDocument.numPages
                        };

                        // Show the properties in the dialog.
                        for (let identifier in content) {
                            this._updateUI(this.fields[identifier], content[identifier]);
                        }
                    }.bind(this));
                },

                /**
                 * @private
                 */
                _updateUI: function PDFDocumentProperties_updateUI(field, content) {
                    if (field && content !== undefined && content !== '') {
                        field.textContent = content;
                    }
                },

                /**
                 * @private
                 */
                _parseFileSize: function PDFDocumentProperties_parseFileSize() {
                    let fileSize = this.rawFileSize, kb = fileSize / 1024;
                    if (!kb) {
                        return;
                    } else if (kb < 1024) {
                        return mozL10n.get('document_properties_kb', {
                            size_kb: (+kb.toPrecision(3)).toLocaleString(),
                            size_b: fileSize.toLocaleString()
                        }, '{{size_kb}} KB ({{size_b}} bytes)');
                    } else {
                        return mozL10n.get('document_properties_mb', {
                            size_mb: (+(kb / 1024).toPrecision(3)).toLocaleString(),
                            size_b: fileSize.toLocaleString()
                        }, '{{size_mb}} MB ({{size_b}} bytes)');
                    }
                },

                /**
                 * @private
                 */
                _parseDate: function PDFDocumentProperties_parseDate(inputDate) {
                    // This is implemented according to the PDF specification, but note that
                    // Adobe Reader doesn't handle changing the date to universal time
                    // and doesn't use the user's time zone (they're effectively ignoring
                    // the HH' and mm' parts of the date string).
                    let dateToParse = inputDate;
                    if (dateToParse === undefined) {
                        return '';
                    }

                    // Remove the D: prefix if it is available.
                    if (dateToParse.substring(0, 2) === 'D:') {
                        dateToParse = dateToParse.substring(2);
                    }

                    // Get all elements from the PDF date string.
                    // JavaScript's Date object expects the month to be between
                    // 0 and 11 instead of 1 and 12, so we're correcting for this.
                    let year = parseInt(dateToParse.substring(0, 4), 10);
                    let month = parseInt(dateToParse.substring(4, 6), 10) - 1;
                    let day = parseInt(dateToParse.substring(6, 8), 10);
                    let hours = parseInt(dateToParse.substring(8, 10), 10);
                    let minutes = parseInt(dateToParse.substring(10, 12), 10);
                    let seconds = parseInt(dateToParse.substring(12, 14), 10);
                    let utRel = dateToParse.substring(14, 15);
                    let offsetHours = parseInt(dateToParse.substring(15, 17), 10);
                    let offsetMinutes = parseInt(dateToParse.substring(18, 20), 10);

                    // As per spec, utRel = 'Z' means equal to universal time.
                    // The other cases ('-' and '+') have to be handled here.
                    if (utRel === '-') {
                        hours += offsetHours;
                        minutes += offsetMinutes;
                    } else if (utRel === '+') {
                        hours -= offsetHours;
                        minutes -= offsetMinutes;
                    }

                    // Return the new date format from the user's locale.
                    let date = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
                    let dateString = date.toLocaleDateString();
                    let timeString = date.toLocaleTimeString();
                    return mozL10n.get('document_properties_date_string',
                        {date: dateString, time: timeString},
                        '{{date}}, {{time}}');
                }
            };

            return PDFDocumentProperties;
        })();

        exports.PDFDocumentProperties = PDFDocumentProperties;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFLinkService = {}), root.pdfjsWebUIUtils);
        }
    }(this, function (exports, uiUtils) {

        let parseQueryString = uiUtils.parseQueryString;

        /**
         * Performs navigation functions inside PDF, such as opening specified page,
         * or destination.
         * @class
         * @implements {IPDFLinkService}
         */
        let PDFLinkService = (function () {
            /**
             * @constructs PDFLinkService
             */
            function PDFLinkService() {
                this.baseUrl = null;
                this.pdfDocument = null;
                this.pdfViewer = null;
                this.pdfHistory = null;

                this._pagesRefCache = null;
            }

            PDFLinkService.prototype = {
                setDocument: function PDFLinkService_setDocument(pdfDocument, baseUrl) {
                    this.baseUrl = baseUrl;
                    this.pdfDocument = pdfDocument;
                    this._pagesRefCache = Object.create(null);
                },

                setViewer: function PDFLinkService_setViewer(pdfViewer) {
                    this.pdfViewer = pdfViewer;
                },

                setHistory: function PDFLinkService_setHistory(pdfHistory) {
                    this.pdfHistory = pdfHistory;
                },

                /**
                 * @returns {number}
                 */
                get pagesCount() {
                    return this.pdfDocument.numPages;
                },

                /**
                 * @returns {number}
                 */
                get page() {
                    return this.pdfViewer.currentPageNumber;
                },

                /**
                 * @param {number} value
                 */
                set page(value) {
                    this.pdfViewer.currentPageNumber = value;
                },

                /**
                 * @param dest - The PDF destination object.
                 */
                navigateTo: function PDFLinkService_navigateTo(dest) {
                    let destString = '';
                    let self = this;

                    let goToDestination = function (destRef) {
                        // dest array looks like that: <page-ref> </XYZ|FitXXX> <args..>
                        let pageNumber = destRef instanceof Object ?
                            self._pagesRefCache[destRef.num + ' ' + destRef.gen + ' R'] :
                            (destRef + 1);
                        if (pageNumber) {
                            if (pageNumber > self.pagesCount) {
                                pageNumber = self.pagesCount;
                            }
                            self.pdfViewer.scrollPageIntoView(pageNumber, dest);

                            if (self.pdfHistory) {
                                // Update the browsing history.
                                self.pdfHistory.push({
                                    dest: dest,
                                    hash: destString,
                                    page: pageNumber
                                });
                            }
                        } else {
                            self.pdfDocument.getPageIndex(destRef).then(function (pageIndex) {
                                let pageNum = pageIndex + 1;
                                let cacheKey = destRef.num + ' ' + destRef.gen + ' R';
                                self._pagesRefCache[cacheKey] = pageNum;
                                goToDestination(destRef);
                            });
                        }
                    };

                    let destinationPromise;
                    if (typeof dest === 'string') {
                        destString = dest;
                        destinationPromise = this.pdfDocument.getDestination(dest);
                    } else {
                        destinationPromise = Promise.resolve(dest);
                    }
                    destinationPromise.then(function (destination) {
                        dest = destination;
                        if (!(destination instanceof Array)) {
                            return; // invalid destination
                        }
                        goToDestination(destination[0]);
                    });
                },

                /**
                 * @param dest - The PDF destination object.
                 * @returns {string} The hyperlink to the PDF object.
                 */
                getDestinationHash: function PDFLinkService_getDestinationHash(dest) {
                    if (typeof dest === 'string') {
                        return this.getAnchorUrl('#' + escape(dest));
                    }
                    if (dest instanceof Array) {
                        let destRef = dest[0]; // see navigateTo method for dest format
                        let pageNumber = destRef instanceof Object ?
                            this._pagesRefCache[destRef.num + ' ' + destRef.gen + ' R'] :
                            (destRef + 1);
                        if (pageNumber) {
                            let pdfOpenParams = this.getAnchorUrl('#page=' + pageNumber);
                            let destKind = dest[1];
                            if (typeof destKind === 'object' && 'name' in destKind &&
                                destKind.name === 'XYZ') {
                                let scale = (dest[4] || this.pdfViewer.currentScaleValue);
                                let scaleNumber = parseFloat(scale);
                                if (scaleNumber) {
                                    scale = scaleNumber * 100;
                                }
                                pdfOpenParams += '&zoom=' + scale;
                                if (dest[2] || dest[3]) {
                                    pdfOpenParams += ',' + (dest[2] || 0) + ',' + (dest[3] || 0);
                                }
                            }
                            return pdfOpenParams;
                        }
                    }
                    return this.getAnchorUrl('');
                },

                /**
                 * Prefix the full url on anchor links to make sure that links are resolved
                 * relative to the current URL instead of the one defined in <base href>.
                 * @param {String} anchor The anchor hash, including the #.
                 * @returns {string} The hyperlink to the PDF object.
                 */
                getAnchorUrl: function PDFLinkService_getAnchorUrl(anchor) {
                    return (this.baseUrl || '') + anchor;
                },

                /**
                 * @param {string} hash
                 */
                setHash: function PDFLinkService_setHash(hash) {
                    if (hash.indexOf('=') >= 0) {
                        let params = parseQueryString(hash);
                        // borrowing syntax from "Parameters for Opening PDF Files"
                        if ('nameddest' in params) {
                            if (this.pdfHistory) {
                                this.pdfHistory.updateNextHashParam(params.nameddest);
                            }
                            this.navigateTo(params.nameddest);
                            return;
                        }
                        let pageNumber, dest;
                        if ('page' in params) {
                            pageNumber = (params.page | 0) || 1;
                        }
                        if ('zoom' in params) {
                            // Build the destination array.
                            let zoomArgs = params.zoom.split(','); // scale,left,top
                            let zoomArg = zoomArgs[0];
                            let zoomArgNumber = parseFloat(zoomArg);

                            if (zoomArg.indexOf('Fit') === -1) {
                                // If the zoomArg is a number, it has to get divided by 100. If it's
                                // a string, it should stay as it is.
                                dest = [null, {name: 'XYZ'},
                                    zoomArgs.length > 1 ? (zoomArgs[1] | 0) : null,
                                    zoomArgs.length > 2 ? (zoomArgs[2] | 0) : null,
                                    (zoomArgNumber ? zoomArgNumber / 100 : zoomArg)];
                            } else {
                                if (zoomArg === 'Fit' || zoomArg === 'FitB') {
                                    dest = [null, {name: zoomArg}];
                                } else if ((zoomArg === 'FitH' || zoomArg === 'FitBH') ||
                                    (zoomArg === 'FitV' || zoomArg === 'FitBV')) {
                                    dest = [null, {name: zoomArg},
                                        zoomArgs.length > 1 ? (zoomArgs[1] | 0) : null];
                                } else if (zoomArg === 'FitR') {
                                    if (zoomArgs.length !== 5) {
                                        console.error('PDFLinkService_setHash: ' +
                                            'Not enough parameters for \'FitR\'.');
                                    } else {
                                        dest = [null, {name: zoomArg},
                                            (zoomArgs[1] | 0), (zoomArgs[2] | 0),
                                            (zoomArgs[3] | 0), (zoomArgs[4] | 0)];
                                    }
                                } else {
                                    console.error('PDFLinkService_setHash: \'' + zoomArg +
                                        '\' is not a valid zoom value.');
                                }
                            }
                        }
                        if (dest) {
                            this.pdfViewer.scrollPageIntoView(pageNumber || this.page, dest);
                        } else if (pageNumber) {
                            this.page = pageNumber; // simple page
                        }
                        if ('pagemode' in params) {
                            let event = document.createEvent('CustomEvent');
                            event.initCustomEvent('pagemode', true, true, {
                                mode: params.pagemode,
                            });
                            this.pdfViewer.container.dispatchEvent(event);
                        }
                    } else if (/^\d+$/.test(hash)) { // page number
                        this.page = hash;
                    } else { // named destination
                        if (this.pdfHistory) {
                            this.pdfHistory.updateNextHashParam(unescape(hash));
                        }
                        this.navigateTo(unescape(hash));
                    }
                },

                /**
                 * @param {string} action
                 */
                executeNamedAction: function PDFLinkService_executeNamedAction(action) {
                    // See PDF reference, table 8.45 - Named action
                    switch (action) {
                        case 'GoBack':
                            if (this.pdfHistory) {
                                this.pdfHistory.back();
                            }
                            break;

                        case 'GoForward':
                            if (this.pdfHistory) {
                                this.pdfHistory.forward();
                            }
                            break;

                        case 'NextPage':
                            this.page++;
                            break;

                        case 'PrevPage':
                            this.page--;
                            break;

                        case 'LastPage':
                            this.page = this.pagesCount;
                            break;

                        case 'FirstPage':
                            this.page = 1;
                            break;

                        default:
                            break; // No action according to spec
                    }

                    let event = document.createEvent('CustomEvent');
                    event.initCustomEvent('namedaction', true, true, {
                        action: action
                    });
                    this.pdfViewer.container.dispatchEvent(event);
                },

                /**
                 * @param {number} pageNum - page number.
                 * @param {Object} pageRef - reference to the page.
                 */
                cachePageRef: function PDFLinkService_cachePageRef(pageNum, pageRef) {
                    let refStr = pageRef.num + ' ' + pageRef.gen + ' R';
                    this._pagesRefCache[refStr] = pageNum;
                }
            };

            return PDFLinkService;
        })();

        let SimpleLinkService = (function SimpleLinkServiceClosure() {
            function SimpleLinkService() {
            }

            SimpleLinkService.prototype = {
                /**
                 * @returns {number}
                 */
                get page() {
                    return 0;
                },
                /**
                 * @param {number} value
                 */
                set page(value) {
                },
                /**
                 * @param dest - The PDF destination object.
                 */
                navigateTo: function (dest) {
                },
                /**
                 * @param dest - The PDF destination object.
                 * @returns {string} The hyperlink to the PDF object.
                 */
                getDestinationHash: function (dest) {
                    return '#';
                },
                /**
                 * @param hash - The PDF parameters/hash.
                 * @returns {string} The hyperlink to the PDF object.
                 */
                getAnchorUrl: function (hash) {
                    return '#';
                },
                /**
                 * @param {string} hash
                 */
                setHash: function (hash) {
                },
                /**
                 * @param {string} action
                 */
                executeNamedAction: function (action) {
                },
                /**
                 * @param {number} pageNum - page number.
                 * @param {Object} pageRef - reference to the page.
                 */
                cachePageRef: function (pageNum, pageRef) {
                }
            };
            return SimpleLinkService;
        })();

        exports.PDFLinkService = PDFLinkService;
        exports.SimpleLinkService = SimpleLinkService;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFPageView = {}), root.pdfjsWebUIUtils,
                root.pdfjsWebPDFRenderingQueue, root.pdfjsWebPDFJS);
        }
    }(this, function (exports, uiUtils, pdfRenderingQueue, pdfjsLib) {

        let CSS_UNITS = uiUtils.CSS_UNITS;
        let DEFAULT_SCALE = uiUtils.DEFAULT_SCALE;
        let getOutputScale = uiUtils.getOutputScale;
        let approximateFraction = uiUtils.approximateFraction;
        let roundToDivide = uiUtils.roundToDivide;
        let RenderingStates = pdfRenderingQueue.RenderingStates;

        let TEXT_LAYER_RENDER_DELAY = 200; // ms

        /**
         * @typedef {Object} PDFPageViewOptions
         * @property {HTMLDivElement} container - The viewer element.
         * @property {number} id - The page unique ID (normally its number).
         * @property {number} scale - The page scale display.
         * @property {PageViewport} defaultViewport - The page viewport.
         * @property {PDFRenderingQueue} renderingQueue - The rendering queue object.
         * @property {IPDFTextLayerFactory} textLayerFactory
         * @property {IPDFAnnotationLayerFactory} annotationLayerFactory
         */

        /**
         * @class
         * @implements {IRenderableView}
         */
        let PDFPageView = (function PDFPageViewClosure() {
            /**
             * @constructs PDFPageView
             * @param {PDFPageViewOptions} options
             */
            function PDFPageView(options) {
                let container = options.container;
                let id = options.id;
                let scale = options.scale;
                let defaultViewport = options.defaultViewport;
                let renderingQueue = options.renderingQueue;
                let textLayerFactory = options.textLayerFactory;
                let annotationLayerFactory = options.annotationLayerFactory;

                this.id = id;
                this.renderingId = 'page' + id;

                this.rotation = 0;
                this.scale = scale || DEFAULT_SCALE;
                this.viewport = defaultViewport;
                this.pdfPageRotate = defaultViewport.rotation;
                this.hasRestrictedScaling = false;

                this.renderingQueue = renderingQueue;
                this.textLayerFactory = textLayerFactory;
                this.annotationLayerFactory = annotationLayerFactory;

                this.renderingState = RenderingStates.INITIAL;
                this.resume = null;

                this.onBeforeDraw = null;
                this.onAfterDraw = null;

                this.textLayer = null;

                this.zoomLayer = null;

                this.annotationLayer = null;

                let div = document.createElement('div');
                div.id = 'pageContainer' + this.id;
                div.className = 'page';
                div.style.width = Math.floor(this.viewport.width) + 'px';
                div.style.height = Math.floor(this.viewport.height) + 'px';
                div.setAttribute('data-page-number', this.id);
                this.div = div;

                container.appendChild(div);
            }

            PDFPageView.prototype = {
                setPdfPage: function PDFPageView_setPdfPage(pdfPage) {
                    this.pdfPage = pdfPage;
                    this.pdfPageRotate = pdfPage.rotate;
                    let totalRotation = (this.rotation + this.pdfPageRotate) % 360;
                    this.viewport = pdfPage.getViewport(this.scale * CSS_UNITS,
                        totalRotation);
                    this.stats = pdfPage.stats;
                    this.reset();
                },

                destroy: function PDFPageView_destroy() {
                    this.zoomLayer = null;
                    this.reset();
                    if (this.pdfPage) {
                        this.pdfPage.cleanup();
                    }
                },

                reset: function PDFPageView_reset(keepZoomLayer, keepAnnotations) {
                    if (this.renderTask) {
                        this.renderTask.cancel();
                    }
                    this.resume = null;
                    this.renderingState = RenderingStates.INITIAL;

                    let div = this.div;
                    div.style.width = Math.floor(this.viewport.width) + 'px';
                    div.style.height = Math.floor(this.viewport.height) + 'px';

                    let childNodes = div.childNodes;
                    let currentZoomLayerNode = (keepZoomLayer && this.zoomLayer) || null;
                    let currentAnnotationNode = (keepAnnotations && this.annotationLayer &&
                        this.annotationLayer.div) || null;
                    for (let i = childNodes.length - 1; i >= 0; i--) {
                        let node = childNodes[i];
                        if (currentZoomLayerNode === node || currentAnnotationNode === node) {
                            continue;
                        }
                        div.removeChild(node);
                    }
                    div.removeAttribute('data-loaded');

                    if (currentAnnotationNode) {
                        // Hide annotationLayer until all elements are resized
                        // so they are not displayed on the already-resized page
                        this.annotationLayer.hide();
                    } else {
                        this.annotationLayer = null;
                    }

                    if (this.canvas && !currentZoomLayerNode) {
                        // Zeroing the width and height causes Firefox to release graphics
                        // resources immediately, which can greatly reduce memory consumption.
                        this.canvas.width = 0;
                        this.canvas.height = 0;
                        delete this.canvas;
                    }

                    this.loadingIconDiv = document.createElement('div');
                    this.loadingIconDiv.className = 'loadingIcon';
                    div.appendChild(this.loadingIconDiv);
                },

                update: function PDFPageView_update(scale, rotation) {
                    this.scale = scale || this.scale;

                    if (typeof rotation !== 'undefined') {
                        this.rotation = rotation;
                    }

                    let totalRotation = (this.rotation + this.pdfPageRotate) % 360;
                    this.viewport = this.viewport.clone({
                        scale: this.scale * CSS_UNITS,
                        rotation: totalRotation
                    });

                    let isScalingRestricted = false;
                    if (this.canvas && pdfjsLib.PDFJS.maxCanvasPixels > 0) {
                        let outputScale = this.outputScale;
                        let pixelsInViewport = this.viewport.width * this.viewport.height;
                        if (((Math.floor(this.viewport.width) * outputScale.sx) | 0) *
                            ((Math.floor(this.viewport.height) * outputScale.sy) | 0) >
                            pdfjsLib.PDFJS.maxCanvasPixels) {
                            isScalingRestricted = true;
                        }
                    }

                    if (this.canvas) {
                        if (pdfjsLib.PDFJS.useOnlyCssZoom ||
                            (this.hasRestrictedScaling && isScalingRestricted)) {
                            this.cssTransform(this.canvas, true);

                            let event = document.createEvent('CustomEvent');
                            event.initCustomEvent('pagerendered', true, true, {
                                pageNumber: this.id,
                                cssTransform: true,
                            });
                            this.div.dispatchEvent(event);

                            return;
                        }
                        if (!this.zoomLayer) {
                            this.zoomLayer = this.canvas.parentNode;
                            this.zoomLayer.style.position = 'absolute';
                        }
                    }
                    if (this.zoomLayer) {
                        this.cssTransform(this.zoomLayer.firstChild);
                    }
                    this.reset(/* keepZoomLayer = */ true, /* keepAnnotations = */ true);
                },

                /**
                 * Called when moved in the parent's container.
                 */
                updatePosition: function PDFPageView_updatePosition() {
                    if (this.textLayer) {
                        this.textLayer.render(TEXT_LAYER_RENDER_DELAY);
                    }
                },

                cssTransform: function PDFPageView_transform(canvas, redrawAnnotations) {
                    let CustomStyle = pdfjsLib.CustomStyle;

                    // Scale canvas, canvas wrapper, and page container.
                    let width = this.viewport.width;
                    let height = this.viewport.height;
                    let div = this.div;
                    canvas.style.width = canvas.parentNode.style.width = div.style.width =
                        Math.floor(width) + 'px';
                    canvas.style.height = canvas.parentNode.style.height = div.style.height =
                        Math.floor(height) + 'px';
                    // The canvas may have been originally rotated, rotate relative to that.
                    let relativeRotation = this.viewport.rotation - canvas._viewport.rotation;
                    let absRotation = Math.abs(relativeRotation);
                    let scaleX = 1, scaleY = 1;
                    if (absRotation === 90 || absRotation === 270) {
                        // Scale x and y because of the rotation.
                        scaleX = height / width;
                        scaleY = width / height;
                    }
                    let cssTransform = 'rotate(' + relativeRotation + 'deg) ' +
                        'scale(' + scaleX + ',' + scaleY + ')';
                    CustomStyle.setProp('transform', canvas, cssTransform);

                    if (this.textLayer) {
                        // Rotating the text layer is more complicated since the divs inside the
                        // the text layer are rotated.
                        // TODO: This could probably be simplified by drawing the text layer in
                        // one orientation then rotating overall.
                        let textLayerViewport = this.textLayer.viewport;
                        let textRelativeRotation = this.viewport.rotation -
                            textLayerViewport.rotation;
                        let textAbsRotation = Math.abs(textRelativeRotation);
                        let scale = width / textLayerViewport.width;
                        if (textAbsRotation === 90 || textAbsRotation === 270) {
                            scale = width / textLayerViewport.height;
                        }
                        let textLayerDiv = this.textLayer.textLayerDiv;
                        let transX, transY;
                        switch (textAbsRotation) {
                            case 0:
                                transX = transY = 0;
                                break;
                            case 90:
                                transX = 0;
                                transY = '-' + textLayerDiv.style.height;
                                break;
                            case 180:
                                transX = '-' + textLayerDiv.style.width;
                                transY = '-' + textLayerDiv.style.height;
                                break;
                            case 270:
                                transX = '-' + textLayerDiv.style.width;
                                transY = 0;
                                break;
                            default:
                                console.error('Bad rotation value.');
                                break;
                        }
                        CustomStyle.setProp('transform', textLayerDiv,
                            'rotate(' + textAbsRotation + 'deg) ' +
                            'scale(' + scale + ', ' + scale + ') ' +
                            'translate(' + transX + ', ' + transY + ')');
                        CustomStyle.setProp('transformOrigin', textLayerDiv, '0% 0%');
                    }

                    if (redrawAnnotations && this.annotationLayer) {
                        this.annotationLayer.render(this.viewport, 'display');
                    }
                },

                get width() {
                    return this.viewport.width;
                },

                get height() {
                    return this.viewport.height;
                },

                getPagePoint: function PDFPageView_getPagePoint(x, y) {
                    return this.viewport.convertToPdfPoint(x, y);
                },

                draw: function PDFPageView_draw() {
                    if (this.renderingState !== RenderingStates.INITIAL) {
                        console.error('Must be in new state before drawing');
                    }

                    this.renderingState = RenderingStates.RUNNING;

                    let pdfPage = this.pdfPage;
                    let viewport = this.viewport;
                    let div = this.div;
                    // Wrap the canvas so if it has a css transform for highdpi the overflow
                    // will be hidden in FF.
                    let canvasWrapper = document.createElement('div');
                    canvasWrapper.style.width = div.style.width;
                    canvasWrapper.style.height = div.style.height;
                    canvasWrapper.classList.add('canvasWrapper');

                    let canvas = document.createElement('canvas');
                    canvas.id = 'page' + this.id;
                    // Keep the canvas hidden until the first draw callback, or until drawing
                    // is complete when `!this.renderingQueue`, to prevent black flickering.
                    canvas.setAttribute('hidden', 'hidden');
                    let isCanvasHidden = true;

                    canvasWrapper.appendChild(canvas);
                    if (this.annotationLayer && this.annotationLayer.div) {
                        // annotationLayer needs to stay on top
                        div.insertBefore(canvasWrapper, this.annotationLayer.div);
                    } else {
                        div.appendChild(canvasWrapper);
                    }
                    this.canvas = canvas;

                    canvas.mozOpaque = true;
                    let ctx = canvas.getContext('2d', {alpha: false});
                    let outputScale = getOutputScale(ctx);
                    this.outputScale = outputScale;

                    if (pdfjsLib.PDFJS.useOnlyCssZoom) {
                        let actualSizeViewport = viewport.clone({scale: CSS_UNITS});
                        // Use a scale that will make the canvas be the original intended size
                        // of the page.
                        outputScale.sx *= actualSizeViewport.width / viewport.width;
                        outputScale.sy *= actualSizeViewport.height / viewport.height;
                        outputScale.scaled = true;
                    }

                    if (pdfjsLib.PDFJS.maxCanvasPixels > 0) {
                        let pixelsInViewport = viewport.width * viewport.height;
                        let maxScale =
                            Math.sqrt(pdfjsLib.PDFJS.maxCanvasPixels / pixelsInViewport);
                        if (outputScale.sx > maxScale || outputScale.sy > maxScale) {
                            outputScale.sx = maxScale;
                            outputScale.sy = maxScale;
                            outputScale.scaled = true;
                            this.hasRestrictedScaling = true;
                        } else {
                            this.hasRestrictedScaling = false;
                        }
                    }

                    let sfx = approximateFraction(outputScale.sx);
                    let sfy = approximateFraction(outputScale.sy);
                    canvas.width = roundToDivide(viewport.width * outputScale.sx, sfx[0]);
                    canvas.height = roundToDivide(viewport.height * outputScale.sy, sfy[0]);
                    canvas.style.width = roundToDivide(viewport.width, sfx[1]) + 'px';
                    canvas.style.height = roundToDivide(viewport.height, sfy[1]) + 'px';
                    // Add the viewport so it's known what it was originally drawn with.
                    canvas._viewport = viewport;

                    let textLayerDiv = null;
                    let textLayer = null;
                    if (this.textLayerFactory) {
                        textLayerDiv = document.createElement('div');
                        textLayerDiv.className = 'textLayer';
                        textLayerDiv.style.width = canvasWrapper.style.width;
                        textLayerDiv.style.height = canvasWrapper.style.height;
                        if (this.annotationLayer && this.annotationLayer.div) {
                            // annotationLayer needs to stay on top
                            div.insertBefore(textLayerDiv, this.annotationLayer.div);
                        } else {
                            div.appendChild(textLayerDiv);
                        }

                        textLayer = this.textLayerFactory.createTextLayerBuilder(textLayerDiv,
                            this.id - 1,
                            this.viewport);
                    }
                    this.textLayer = textLayer;

                    let resolveRenderPromise, rejectRenderPromise;
                    let promise = new Promise(function (resolve, reject) {
                        resolveRenderPromise = resolve;
                        rejectRenderPromise = reject;
                    });

                    // Rendering area

                    let self = this;

                    function pageViewDrawCallback(error) {
                        // The renderTask may have been replaced by a new one, so only remove
                        // the reference to the renderTask if it matches the one that is
                        // triggering this callback.
                        if (renderTask === self.renderTask) {
                            self.renderTask = null;
                        }

                        if (error === 'cancelled') {
                            rejectRenderPromise(error);
                            return;
                        }

                        self.renderingState = RenderingStates.FINISHED;

                        if (isCanvasHidden) {
                            self.canvas.removeAttribute('hidden');
                            isCanvasHidden = false;
                        }

                        if (self.loadingIconDiv) {
                            div.removeChild(self.loadingIconDiv);
                            delete self.loadingIconDiv;
                        }

                        if (self.zoomLayer) {
                            // Zeroing the width and height causes Firefox to release graphics
                            // resources immediately, which can greatly reduce memory consumption.
                            let zoomLayerCanvas = self.zoomLayer.firstChild;
                            zoomLayerCanvas.width = 0;
                            zoomLayerCanvas.height = 0;

                            div.removeChild(self.zoomLayer);
                            self.zoomLayer = null;
                        }

                        self.error = error;
                        self.stats = pdfPage.stats;
                        if (self.onAfterDraw) {
                            self.onAfterDraw();
                        }
                        let event = document.createEvent('CustomEvent');
                        event.initCustomEvent('pagerendered', true, true, {
                            pageNumber: self.id,
                            cssTransform: false,
                        });
                        div.dispatchEvent(event);

                        if (!error) {
                            resolveRenderPromise(undefined);
                        } else {
                            rejectRenderPromise(error);
                        }
                    }

                    let renderContinueCallback = null;
                    if (this.renderingQueue) {
                        renderContinueCallback = function renderContinueCallback(cont) {
                            if (!self.renderingQueue.isHighestPriority(self)) {
                                self.renderingState = RenderingStates.PAUSED;
                                self.resume = function resumeCallback() {
                                    self.renderingState = RenderingStates.RUNNING;
                                    cont();
                                };
                                return;
                            }
                            if (isCanvasHidden) {
                                self.canvas.removeAttribute('hidden');
                                isCanvasHidden = false;
                            }
                            cont();
                        };
                    }

                    let transform = !outputScale.scaled ? null :
                        [outputScale.sx, 0, 0, outputScale.sy, 0, 0];
                    let renderContext = {
                        canvasContext: ctx,
                        transform: transform,
                        viewport: this.viewport,
                        // intent: 'default', // === 'display'
                    };
                    let renderTask = this.renderTask = this.pdfPage.render(renderContext);
                    renderTask.onContinue = renderContinueCallback;

                    this.renderTask.promise.then(
                        function pdfPageRenderCallback() {
                            pageViewDrawCallback(null);
                            if (textLayer) {
                                self.pdfPage.getTextContent({normalizeWhitespace: true}).then(
                                    function textContentResolved(textContent) {
                                        textLayer.setTextContent(textContent);
                                        textLayer.render(TEXT_LAYER_RENDER_DELAY);
                                    }
                                );
                            }
                        },
                        function pdfPageRenderError(error) {
                            pageViewDrawCallback(error);
                        }
                    );

                    if (this.annotationLayerFactory) {
                        if (!this.annotationLayer) {
                            this.annotationLayer = this.annotationLayerFactory.createAnnotationLayerBuilder(div, this.pdfPage);
                        }
                        this.annotationLayer.render(this.viewport, 'display');
                    }
                    div.setAttribute('data-loaded', true);

                    if (self.onBeforeDraw) {
                        self.onBeforeDraw();
                    }
                    return promise;
                },
            };

            return PDFPageView;
        })();

        exports.PDFPageView = PDFPageView;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFThumbnailView = {}), root.pdfjsWebUIUtils,
                root.pdfjsWebPDFRenderingQueue);
        }
    }(this, function (exports, uiUtils, pdfRenderingQueue) {

        let mozL10n = uiUtils.mozL10n;
        let getOutputScale = uiUtils.getOutputScale;
        let RenderingStates = pdfRenderingQueue.RenderingStates;

        let THUMBNAIL_WIDTH = 98; // px
        let THUMBNAIL_CANVAS_BORDER_WIDTH = 1; // px

        /**
         * @typedef {Object} PDFThumbnailViewOptions
         * @property {HTMLDivElement} container - The viewer element.
         * @property {number} id - The thumbnail's unique ID (normally its number).
         * @property {PageViewport} defaultViewport - The page viewport.
         * @property {IPDFLinkService} linkService - The navigation/linking service.
         * @property {PDFRenderingQueue} renderingQueue - The rendering queue object.
         * @property {boolean} disableCanvasToImageConversion - (optional) Don't convert
         *   the canvas thumbnails to images. This prevents `toDataURL` calls,
         *   but increases the overall memory usage. The default value is false.
         */

        /**
         * @class
         * @implements {IRenderableView}
         */
        let PDFThumbnailView = (function PDFThumbnailViewClosure() {
            function getTempCanvas(width, height) {
                let tempCanvas = PDFThumbnailView.tempImageCache;
                if (!tempCanvas) {
                    tempCanvas = document.createElement('canvas');
                    PDFThumbnailView.tempImageCache = tempCanvas;
                }
                tempCanvas.width = width;
                tempCanvas.height = height;

                // Since this is a temporary canvas, we need to fill the canvas with a white
                // background ourselves. `_getPageDrawContext` uses CSS rules for this.
                tempCanvas.mozOpaque = true;
                let ctx = tempCanvas.getContext('2d', {alpha: false});
                ctx.save();
                ctx.fillStyle = 'rgb(255, 255, 255)';
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
                return tempCanvas;
            }

            /**
             * @constructs PDFThumbnailView
             * @param {PDFThumbnailViewOptions} options
             */
            function PDFThumbnailView(options) {
                let container = options.container;
                let id = options.id;
                let defaultViewport = options.defaultViewport;
                let linkService = options.linkService;
                let renderingQueue = options.renderingQueue;
                let disableCanvasToImageConversion =
                    options.disableCanvasToImageConversion || false;

                this.id = id;
                this.renderingId = 'thumbnail' + id;

                this.pdfPage = null;
                this.rotation = 0;
                this.viewport = defaultViewport;
                this.pdfPageRotate = defaultViewport.rotation;

                this.linkService = linkService;
                this.renderingQueue = renderingQueue;

                this.resume = null;
                this.renderingState = RenderingStates.INITIAL;
                this.disableCanvasToImageConversion = disableCanvasToImageConversion;

                this.pageWidth = this.viewport.width;
                this.pageHeight = this.viewport.height;
                this.pageRatio = this.pageWidth / this.pageHeight;

                this.canvasWidth = THUMBNAIL_WIDTH;
                this.canvasHeight = (this.canvasWidth / this.pageRatio) | 0;
                this.scale = this.canvasWidth / this.pageWidth;

                let anchor = document.createElement('a');
                anchor.href = linkService.getAnchorUrl('#page=' + id);
                anchor.title = mozL10n.get('thumb_page_title', {page: id}, 'Page {{page}}');
                anchor.onclick = function stopNavigation() {
                    linkService.page = id;
                    return false;
                };

                let div = document.createElement('div');
                div.id = 'thumbnailContainer' + id;
                div.className = 'thumbnail';
                this.div = div;

                if (id === 1) {
                    // Highlight the thumbnail of the first page when no page number is
                    // specified (or exists in cache) when the document is loaded.
                    div.classList.add('selected');
                }

                let ring = document.createElement('div');
                ring.className = 'thumbnailSelectionRing';
                let borderAdjustment = 2 * THUMBNAIL_CANVAS_BORDER_WIDTH;
                ring.style.width = this.canvasWidth + borderAdjustment + 'px';
                ring.style.height = this.canvasHeight + borderAdjustment + 'px';
                this.ring = ring;

                div.appendChild(ring);
                anchor.appendChild(div);
                container.appendChild(anchor);
            }

            PDFThumbnailView.prototype = {
                setPdfPage: function PDFThumbnailView_setPdfPage(pdfPage) {
                    this.pdfPage = pdfPage;
                    this.pdfPageRotate = pdfPage.rotate;
                    let totalRotation = (this.rotation + this.pdfPageRotate) % 360;
                    this.viewport = pdfPage.getViewport(1, totalRotation);
                    this.reset();
                },

                reset: function PDFThumbnailView_reset() {
                    if (this.renderTask) {
                        this.renderTask.cancel();
                    }
                    this.resume = null;
                    this.renderingState = RenderingStates.INITIAL;

                    this.pageWidth = this.viewport.width;
                    this.pageHeight = this.viewport.height;
                    this.pageRatio = this.pageWidth / this.pageHeight;

                    this.canvasHeight = (this.canvasWidth / this.pageRatio) | 0;
                    this.scale = (this.canvasWidth / this.pageWidth);

                    this.div.removeAttribute('data-loaded');
                    let ring = this.ring;
                    let childNodes = ring.childNodes;
                    for (let i = childNodes.length - 1; i >= 0; i--) {
                        ring.removeChild(childNodes[i]);
                    }
                    let borderAdjustment = 2 * THUMBNAIL_CANVAS_BORDER_WIDTH;
                    ring.style.width = this.canvasWidth + borderAdjustment + 'px';
                    ring.style.height = this.canvasHeight + borderAdjustment + 'px';

                    if (this.canvas) {
                        // Zeroing the width and height causes Firefox to release graphics
                        // resources immediately, which can greatly reduce memory consumption.
                        this.canvas.width = 0;
                        this.canvas.height = 0;
                        delete this.canvas;
                    }
                    if (this.image) {
                        this.image.removeAttribute('src');
                        delete this.image;
                    }
                },

                update: function PDFThumbnailView_update(rotation) {
                    if (typeof rotation !== 'undefined') {
                        this.rotation = rotation;
                    }
                    let totalRotation = (this.rotation + this.pdfPageRotate) % 360;
                    this.viewport = this.viewport.clone({
                        scale: 1,
                        rotation: totalRotation
                    });
                    this.reset();
                },

                /**
                 * @private
                 */
                _getPageDrawContext:
                    function PDFThumbnailView_getPageDrawContext(noCtxScale) {
                        let canvas = document.createElement('canvas');
                        // until rendering/image conversion is complete, to avoid display issues.
                        this.canvas = canvas;

                        canvas.mozOpaque = true;
                        let ctx = canvas.getContext('2d', {alpha: false});
                        let outputScale = getOutputScale(ctx);

                        canvas.width = (this.canvasWidth * outputScale.sx) | 0;
                        canvas.height = (this.canvasHeight * outputScale.sy) | 0;
                        canvas.style.width = this.canvasWidth + 'px';
                        canvas.style.height = this.canvasHeight + 'px';

                        if (!noCtxScale && outputScale.scaled) {
                            ctx.scale(outputScale.sx, outputScale.sy);
                        }
                        return ctx;
                    },

                /**
                 * @private
                 */
                _convertCanvasToImage: function PDFThumbnailView_convertCanvasToImage() {
                    if (!this.canvas) {
                        return;
                    }
                    if (this.renderingState !== RenderingStates.FINISHED) {
                        return;
                    }
                    let id = this.renderingId;
                    let className = 'thumbnailImage';
                    let ariaLabel = mozL10n.get('thumb_page_canvas', {page: this.id},
                        'Thumbnail of Page {{page}}');

                    if (this.disableCanvasToImageConversion) {
                        this.canvas.id = id;
                        this.canvas.className = className;
                        this.canvas.setAttribute('aria-label', ariaLabel);

                        this.div.setAttribute('data-loaded', true);
                        this.ring.appendChild(this.canvas);
                        return;
                    }
                    let image = document.createElement('img');
                    image.id = id;
                    image.className = className;
                    image.setAttribute('aria-label', ariaLabel);

                    image.style.width = this.canvasWidth + 'px';
                    image.style.height = this.canvasHeight + 'px';

                    image.src = this.canvas.toDataURL();
                    this.image = image;

                    this.div.setAttribute('data-loaded', true);
                    this.ring.appendChild(image);

                    // Zeroing the width and height causes Firefox to release graphics
                    // resources immediately, which can greatly reduce memory consumption.
                    this.canvas.width = 0;
                    this.canvas.height = 0;
                    delete this.canvas;
                },

                draw: function PDFThumbnailView_draw() {
                    if (this.renderingState !== RenderingStates.INITIAL) {
                        console.error('Must be in new state before drawing');
                        return Promise.resolve(undefined);
                    }

                    this.renderingState = RenderingStates.RUNNING;

                    let resolveRenderPromise, rejectRenderPromise;
                    let promise = new Promise(function (resolve, reject) {
                        resolveRenderPromise = resolve;
                        rejectRenderPromise = reject;
                    });

                    let self = this;

                    function thumbnailDrawCallback(error) {
                        // The renderTask may have been replaced by a new one, so only remove
                        // the reference to the renderTask if it matches the one that is
                        // triggering this callback.
                        if (renderTask === self.renderTask) {
                            self.renderTask = null;
                        }
                        if (error === 'cancelled') {
                            rejectRenderPromise(error);
                            return;
                        }

                        self.renderingState = RenderingStates.FINISHED;
                        self._convertCanvasToImage();

                        if (!error) {
                            resolveRenderPromise(undefined);
                        } else {
                            rejectRenderPromise(error);
                        }
                    }

                    let ctx = this._getPageDrawContext();
                    let drawViewport = this.viewport.clone({scale: this.scale});
                    let renderContinueCallback = function renderContinueCallback(cont) {
                        if (!self.renderingQueue.isHighestPriority(self)) {
                            self.renderingState = RenderingStates.PAUSED;
                            self.resume = function resumeCallback() {
                                self.renderingState = RenderingStates.RUNNING;
                                cont();
                            };
                            return;
                        }
                        cont();
                    };

                    let renderContext = {
                        canvasContext: ctx,
                        viewport: drawViewport
                    };
                    let renderTask = this.renderTask = this.pdfPage.render(renderContext);
                    renderTask.onContinue = renderContinueCallback;

                    renderTask.promise.then(
                        function pdfPageRenderCallback() {
                            thumbnailDrawCallback(null);
                        },
                        function pdfPageRenderError(error) {
                            thumbnailDrawCallback(error);
                        }
                    );
                    return promise;
                },

                setImage: function PDFThumbnailView_setImage(pageView) {
                    if (this.renderingState !== RenderingStates.INITIAL) {
                        return;
                    }
                    let img = pageView.canvas;
                    if (!img) {
                        return;
                    }
                    if (!this.pdfPage) {
                        this.setPdfPage(pageView.pdfPage);
                    }

                    this.renderingState = RenderingStates.FINISHED;

                    let ctx = this._getPageDrawContext(true);
                    let canvas = ctx.canvas;

                    if (img.width <= 2 * canvas.width) {
                        ctx.drawImage(img, 0, 0, img.width, img.height,
                            0, 0, canvas.width, canvas.height);
                        this._convertCanvasToImage();
                        return;
                    }
                    // drawImage does an awful job of rescaling the image, doing it gradually.
                    let MAX_NUM_SCALING_STEPS = 3;
                    let reducedWidth = canvas.width << MAX_NUM_SCALING_STEPS;
                    let reducedHeight = canvas.height << MAX_NUM_SCALING_STEPS;
                    let reducedImage = getTempCanvas(reducedWidth, reducedHeight);
                    let reducedImageCtx = reducedImage.getContext('2d');

                    while (reducedWidth > img.width || reducedHeight > img.height) {
                        reducedWidth >>= 1;
                        reducedHeight >>= 1;
                    }
                    reducedImageCtx.drawImage(img, 0, 0, img.width, img.height,
                        0, 0, reducedWidth, reducedHeight);
                    while (reducedWidth > 2 * canvas.width) {
                        reducedImageCtx.drawImage(reducedImage,
                            0, 0, reducedWidth, reducedHeight,
                            0, 0, reducedWidth >> 1, reducedHeight >> 1);
                        reducedWidth >>= 1;
                        reducedHeight >>= 1;
                    }
                    ctx.drawImage(reducedImage, 0, 0, reducedWidth, reducedHeight,
                        0, 0, canvas.width, canvas.height);
                    this._convertCanvasToImage();
                }
            };

            return PDFThumbnailView;
        })();

        PDFThumbnailView.tempImageCache = null;

        exports.PDFThumbnailView = PDFThumbnailView;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebSecondaryToolbar = {}), root.pdfjsWebUIUtils);
        }
    }(this, function (exports, uiUtils) {

        let SCROLLBAR_PADDING = uiUtils.SCROLLBAR_PADDING;

        let app; // Avoiding circular reference, see _setApp function below.
        let PDFViewerApplication = null; // = app.PDFViewerApplication;

        let SecondaryToolbar = {
            opened: false,
            previousContainerHeight: null,
            newContainerHeight: null,

            initialize: function secondaryToolbarInitialize(options) {
                this.toolbar = options.toolbar;
                this.buttonContainer = this.toolbar.firstElementChild;

                // Define the toolbar buttons.
                this.toggleButton = options.toggleButton;
                this.presentationModeButton = options.presentationModeButton;
                this.firstPage = options.firstPage;
                this.lastPage = options.lastPage;
                this.pageRotateCw = options.pageRotateCw;
                this.pageRotateCcw = options.pageRotateCcw;
                this.documentPropertiesButton = options.documentPropertiesButton;

                // Attach the event listeners.
                let elements = [
                    // Button to toggle the visibility of the secondary toolbar:
                    {element: this.toggleButton, handler: this.toggle},
                    // All items within the secondary toolbar
                    // (except for toggleHandTool, hand_tool.js is responsible for it):
                    {
                        element: this.presentationModeButton,
                        handler: this.presentationModeClick
                    },
                    {element: this.firstPage, handler: this.firstPageClick},
                    {element: this.lastPage, handler: this.lastPageClick},
                    {element: this.pageRotateCw, handler: this.pageRotateCwClick},
                    {element: this.pageRotateCcw, handler: this.pageRotateCcwClick},
                    {
                        element: this.documentPropertiesButton,
                        handler: this.documentPropertiesClick
                    }
                ];

                for (let item in elements) {
                    let element = elements[item].element;
                    if (element) {
                        element.addEventListener('click', elements[item].handler.bind(this));
                    }
                }
            },

            // Event handling functions.
            presentationModeClick: function secondaryToolbarPresentationModeClick(evt) {
                PDFViewerApplication.requestPresentationMode();
                this.close();
            },

            firstPageClick: function secondaryToolbarFirstPageClick(evt) {
                PDFViewerApplication.page = 1;
                this.close();
            },

            lastPageClick: function secondaryToolbarLastPageClick(evt) {
                if (PDFViewerApplication.pdfDocument) {
                    PDFViewerApplication.page = PDFViewerApplication.pagesCount;
                }
                this.close();
            },

            pageRotateCwClick: function secondaryToolbarPageRotateCwClick(evt) {
                PDFViewerApplication.rotatePages(90);
            },

            pageRotateCcwClick: function secondaryToolbarPageRotateCcwClick(evt) {
                PDFViewerApplication.rotatePages(-90);
            },

            documentPropertiesClick: function secondaryToolbarDocumentPropsClick(evt) {
                PDFViewerApplication.pdfDocumentProperties.open();
                this.close();
            },

            // Misc. functions for interacting with the toolbar.
            setMaxHeight: function secondaryToolbarSetMaxHeight(container) {
                if (!container || !this.buttonContainer) {
                    return;
                }
                this.newContainerHeight = container.clientHeight;
                if (this.previousContainerHeight === this.newContainerHeight) {
                    return;
                }
                this.buttonContainer.setAttribute('style',
                    'max-height: ' + (this.newContainerHeight - SCROLLBAR_PADDING) + 'px;');
                this.previousContainerHeight = this.newContainerHeight;
            },

            open: function secondaryToolbarOpen() {
                if (this.opened) {
                    return;
                }
                this.opened = true;
                this.toggleButton.classList.add('toggled');
                this.toolbar.classList.remove('hidden');
            },

            close: function secondaryToolbarClose(target) {
                if (!this.opened) {
                    return;
                } else if (target && !this.toolbar.contains(target)) {
                    return;
                }
                this.opened = false;
                this.toolbar.classList.add('hidden');
                this.toggleButton.classList.remove('toggled');
            },

            toggle: function secondaryToolbarToggle() {
                if (this.opened) {
                    this.close();
                } else {
                    this.open();
                }
            }
        };

        function _setApp(app_) {
            app = app_;
            PDFViewerApplication = app.PDFViewerApplication;
        }

        exports.SecondaryToolbar = SecondaryToolbar;
        exports._setApp = _setApp;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebAnnotationLayerBuilder = {}), root.pdfjsWebUIUtils,
                root.pdfjsWebPDFLinkService, root.pdfjsWebPDFJS);
        }
    }(this, function (exports, uiUtils, pdfLinkService, pdfjsLib) {

        let mozL10n = uiUtils.mozL10n;
        let SimpleLinkService = pdfLinkService.SimpleLinkService;

        /**
         * @typedef {Object} AnnotationLayerBuilderOptions
         * @property {HTMLDivElement} pageDiv
         * @property {PDFPage} pdfPage
         * @property {IPDFLinkService} linkService
         */

        /**
         * @class
         */
        let AnnotationLayerBuilder = (function AnnotationLayerBuilderClosure() {
            /**
             * @param {AnnotationLayerBuilderOptions} options
             * @constructs AnnotationLayerBuilder
             */
            function AnnotationLayerBuilder(options) {
                this.pageDiv = options.pageDiv;
                this.pdfPage = options.pdfPage;
                this.linkService = options.linkService;

                this.div = null;
            }

            AnnotationLayerBuilder.prototype =
                /** @lends AnnotationLayerBuilder.prototype */ {

                /**
                 * @param {PageViewport} viewport
                 * @param {string} intent (default value is 'display')
                 */
                render: function AnnotationLayerBuilder_render(viewport, intent) {
                    let self = this;
                    let parameters = {
                        intent: (intent === undefined ? 'display' : intent),
                    };

                    this.pdfPage.getAnnotations(parameters).then(function (annotations) {
                        viewport = viewport.clone({dontFlip: true});
                        parameters = {
                            viewport: viewport,
                            div: self.div,
                            annotations: annotations,
                            page: self.pdfPage,
                            linkService: self.linkService,
                        };

                        if (self.div) {
                            // If an annotationLayer already exists, refresh its children's
                            // transformation matrices.
                            pdfjsLib.AnnotationLayer.update(parameters);
                        } else {
                            // Create an annotation layer div and render the annotations
                            // if there is at least one annotation.
                            if (annotations.length === 0) {
                                return;
                            }

                            self.div = document.createElement('div');
                            self.div.className = 'annotationLayer';
                            self.pageDiv.appendChild(self.div);
                            parameters.div = self.div;

                            pdfjsLib.AnnotationLayer.render(parameters);
                            if (typeof mozL10n !== 'undefined') {
                                mozL10n.translate(self.div);
                            }
                        }
                    });
                },

                hide: function AnnotationLayerBuilder_hide() {
                    if (!this.div) {
                        return;
                    }
                    this.div.setAttribute('hidden', 'true');
                }
            };

            return AnnotationLayerBuilder;
        })();

        exports.AnnotationLayerBuilder = AnnotationLayerBuilder;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebHandTool = {}), root.pdfjsWebUIUtils,
                root.pdfjsWebGrabToPan, root.pdfjsWebPreferences,
                root.pdfjsWebSecondaryToolbar);
        }
    }(this, function (exports, uiUtils, grabToPan, preferences, secondaryToolbar) {

        let mozL10n = uiUtils.mozL10n;
        let GrabToPan = grabToPan.GrabToPan;
        let Preferences = preferences.Preferences;
        let SecondaryToolbar = secondaryToolbar.SecondaryToolbar;

        /**
         * @typedef {Object} HandToolOptions
         * @property {HTMLDivElement} container - The document container.
         * @property {HTMLButtonElement} toggleHandTool - The button element for
         *                                                toggling the hand tool.
         */

        /**
         * @class
         */
        let HandTool = (function HandToolClosure() {
            /**
             * @constructs HandTool
             * @param {HandToolOptions} options
             */
            function HandTool(options) {
                this.container = options.container;
                this.toggleHandTool = options.toggleHandTool;

                this.wasActive = false;

                this.handTool = new GrabToPan({
                    element: this.container,
                    onActiveChanged: function (isActive) {
                        if (!this.toggleHandTool) {
                            return;
                        }
                        if (isActive) {
                            this.toggleHandTool.title =
                                mozL10n.get('hand_tool_disable.title', null, 'Disable hand tool');
                            this.toggleHandTool.firstElementChild.textContent =
                                mozL10n.get('hand_tool_disable_label', null, 'Disable hand tool');
                        } else {
                            this.toggleHandTool.title =
                                mozL10n.get('hand_tool_enable.title', null, 'Enable hand tool');
                            this.toggleHandTool.firstElementChild.textContent =
                                mozL10n.get('hand_tool_enable_label', null, 'Enable hand tool');
                        }
                    }.bind(this)
                });

                if (this.toggleHandTool) {
                    this.toggleHandTool.addEventListener('click', this.toggle.bind(this));

                    window.addEventListener('localized', function (evt) {
                        Preferences.get('enableHandToolOnLoad').then(function resolved(value) {
                            if (value) {
                                this.handTool.activate();
                            }
                        }.bind(this), function rejected(reason) {
                        });
                    }.bind(this));

                    window.addEventListener('presentationmodechanged', function (evt) {
                        if (evt.detail.switchInProgress) {
                            return;
                        }
                        if (evt.detail.active) {
                            this.enterPresentationMode();
                        } else {
                            this.exitPresentationMode();
                        }
                    }.bind(this));
                }
            }

            HandTool.prototype = {
                /**
                 * @return {boolean}
                 */
                get isActive() {
                    return !!this.handTool.active;
                },

                toggle: function HandTool_toggle() {
                    this.handTool.toggle();
                    SecondaryToolbar.close();
                },

                enterPresentationMode: function HandTool_enterPresentationMode() {
                    if (this.isActive) {
                        this.wasActive = true;
                        this.handTool.deactivate();
                    }
                },

                exitPresentationMode: function HandTool_exitPresentationMode() {
                    if (this.wasActive) {
                        this.wasActive = false;
                        this.handTool.activate();
                    }
                }
            };

            return HandTool;
        })();

        exports.HandTool = HandTool;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFThumbnailViewer = {}), root.pdfjsWebUIUtils,
                root.pdfjsWebPDFThumbnailView);
        }
    }(this, function (exports, uiUtils, pdfThumbnailView) {

        let watchScroll = uiUtils.watchScroll;
        let getVisibleElements = uiUtils.getVisibleElements;
        let scrollIntoView = uiUtils.scrollIntoView;
        let PDFThumbnailView = pdfThumbnailView.PDFThumbnailView;

        let THUMBNAIL_SCROLL_MARGIN = -19;

        /**
         * @typedef {Object} PDFThumbnailViewerOptions
         * @property {HTMLDivElement} container - The container for the thumbnail
         *   elements.
         * @property {IPDFLinkService} linkService - The navigation/linking service.
         * @property {PDFRenderingQueue} renderingQueue - The rendering queue object.
         */

        /**
         * Simple viewer control to display thumbnails for pages.
         * @class
         * @implements {IRenderableView}
         */
        let PDFThumbnailViewer = (function PDFThumbnailViewerClosure() {
            /**
             * @constructs PDFThumbnailViewer
             * @param {PDFThumbnailViewerOptions} options
             */
            function PDFThumbnailViewer(options) {
                this.container = options.container;
                this.renderingQueue = options.renderingQueue;
                this.linkService = options.linkService;

                this.scroll = watchScroll(this.container, this._scrollUpdated.bind(this));
                this._resetView();
            }

            PDFThumbnailViewer.prototype = {
                /**
                 * @private
                 */
                _scrollUpdated: function PDFThumbnailViewer_scrollUpdated() {
                    this.renderingQueue.renderHighestPriority();
                },

                getThumbnail: function PDFThumbnailViewer_getThumbnail(index) {
                    return this.thumbnails[index];
                },

                /**
                 * @private
                 */
                _getVisibleThumbs: function PDFThumbnailViewer_getVisibleThumbs() {
                    return getVisibleElements(this.container, this.thumbnails);
                },

                scrollThumbnailIntoView:
                    function PDFThumbnailViewer_scrollThumbnailIntoView(page) {
                        let selected = document.querySelector('.thumbnail.selected');
                        if (selected) {
                            selected.classList.remove('selected');
                        }
                        let thumbnail = document.getElementById('thumbnailContainer' + page);
                        if (thumbnail) {
                            thumbnail.classList.add('selected');
                        }
                        let visibleThumbs = this._getVisibleThumbs();
                        let numVisibleThumbs = visibleThumbs.views.length;

                        // If the thumbnail isn't currently visible, scroll it into view.
                        if (numVisibleThumbs > 0) {
                            let first = visibleThumbs.first.id;
                            // Account for only one thumbnail being visible.
                            let last = (numVisibleThumbs > 1 ? visibleThumbs.last.id : first);
                            if (page <= first || page >= last) {
                                scrollIntoView(thumbnail, {top: THUMBNAIL_SCROLL_MARGIN});
                            }
                        }
                    },

                get pagesRotation() {
                    return this._pagesRotation;
                },

                set pagesRotation(rotation) {
                    this._pagesRotation = rotation;
                    for (let i = 0, l = this.thumbnails.length; i < l; i++) {
                        let thumb = this.thumbnails[i];
                        thumb.update(rotation);
                    }
                },

                cleanup: function PDFThumbnailViewer_cleanup() {
                    let tempCanvas = PDFThumbnailView.tempImageCache;
                    if (tempCanvas) {
                        // Zeroing the width and height causes Firefox to release graphics
                        // resources immediately, which can greatly reduce memory consumption.
                        tempCanvas.width = 0;
                        tempCanvas.height = 0;
                    }
                    PDFThumbnailView.tempImageCache = null;
                },

                /**
                 * @private
                 */
                _resetView: function PDFThumbnailViewer_resetView() {
                    this.thumbnails = [];
                    this._pagesRotation = 0;
                    this._pagesRequests = [];
                },

                setDocument: function PDFThumbnailViewer_setDocument(pdfDocument) {
                    if (this.pdfDocument) {
                        // cleanup of the elements and views
                        let thumbsView = this.container;
                        while (thumbsView.hasChildNodes()) {
                            thumbsView.removeChild(thumbsView.lastChild);
                        }
                        this._resetView();
                    }

                    this.pdfDocument = pdfDocument;
                    if (!pdfDocument) {
                        return Promise.resolve();
                    }

                    return pdfDocument.getPage(1).then(function (firstPage) {
                        let pagesCount = pdfDocument.numPages;
                        let viewport = firstPage.getViewport(1.0);
                        for (let pageNum = 1; pageNum <= pagesCount; ++pageNum) {
                            let thumbnail = new PDFThumbnailView({
                                container: this.container,
                                id: pageNum,
                                defaultViewport: viewport.clone(),
                                linkService: this.linkService,
                                renderingQueue: this.renderingQueue,
                                disableCanvasToImageConversion: false,
                            });
                            this.thumbnails.push(thumbnail);
                        }
                    }.bind(this));
                },

                /**
                 * @param {PDFPageView} pageView
                 * @returns {PDFPage}
                 * @private
                 */
                _ensurePdfPageLoaded:
                    function PDFThumbnailViewer_ensurePdfPageLoaded(thumbView) {
                        if (thumbView.pdfPage) {
                            return Promise.resolve(thumbView.pdfPage);
                        }
                        let pageNumber = thumbView.id;
                        if (this._pagesRequests[pageNumber]) {
                            return this._pagesRequests[pageNumber];
                        }
                        let promise = this.pdfDocument.getPage(pageNumber).then(
                            function (pdfPage) {
                                thumbView.setPdfPage(pdfPage);
                                this._pagesRequests[pageNumber] = null;
                                return pdfPage;
                            }.bind(this));
                        this._pagesRequests[pageNumber] = promise;
                        return promise;
                    },

                forceRendering: function () {
                    let visibleThumbs = this._getVisibleThumbs();
                    let thumbView = this.renderingQueue.getHighestPriority(visibleThumbs,
                        this.thumbnails,
                        this.scroll.down);
                    if (thumbView) {
                        this._ensurePdfPageLoaded(thumbView).then(function () {
                            this.renderingQueue.renderView(thumbView);
                        }.bind(this));
                        return true;
                    }
                    return false;
                }
            };

            return PDFThumbnailViewer;
        })();

        exports.PDFThumbnailViewer = PDFThumbnailViewer;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebPDFViewer = {}), root.pdfjsWebUIUtils,
                root.pdfjsWebPDFPageView, root.pdfjsWebPDFRenderingQueue,
                root.pdfjsWebTextLayerBuilder, root.pdfjsWebAnnotationLayerBuilder,
                root.pdfjsWebPDFLinkService, root.pdfjsWebPDFJS);
        }
    }(this, function (exports, uiUtils, pdfPageView, pdfRenderingQueue,
                      textLayerBuilder, annotationLayerBuilder, pdfLinkService,
                      pdfjsLib) {

        let UNKNOWN_SCALE = uiUtils.UNKNOWN_SCALE;
        let SCROLLBAR_PADDING = uiUtils.SCROLLBAR_PADDING;
        let VERTICAL_PADDING = uiUtils.VERTICAL_PADDING;
        let MAX_AUTO_SCALE = uiUtils.MAX_AUTO_SCALE;
        let CSS_UNITS = uiUtils.CSS_UNITS;
        let DEFAULT_SCALE = uiUtils.DEFAULT_SCALE;
        let DEFAULT_SCALE_VALUE = uiUtils.DEFAULT_SCALE_VALUE;
        let scrollIntoView = uiUtils.scrollIntoView;
        let watchScroll = uiUtils.watchScroll;
        let getVisibleElements = uiUtils.getVisibleElements;
        let PDFPageView = pdfPageView.PDFPageView;
        let RenderingStates = pdfRenderingQueue.RenderingStates;
        let PDFRenderingQueue = pdfRenderingQueue.PDFRenderingQueue;
        let TextLayerBuilder = textLayerBuilder.TextLayerBuilder;
        let AnnotationLayerBuilder = annotationLayerBuilder.AnnotationLayerBuilder;
        let SimpleLinkService = pdfLinkService.SimpleLinkService;

        let PresentationModeState = {
            UNKNOWN: 0,
            NORMAL: 1,
            CHANGING: 2,
            FULLSCREEN: 3,
        };

        let DEFAULT_CACHE_SIZE = 10;

        /**
         * @typedef {Object} PDFViewerOptions
         * @property {HTMLDivElement} container - The container for the viewer element.
         * @property {HTMLDivElement} viewer - (optional) The viewer element.
         * @property {IPDFLinkService} linkService - The navigation/linking service.
         *   manager component.
         * @property {PDFRenderingQueue} renderingQueue - (optional) The rendering
         *   queue object.
         * @property {boolean} removePageBorders - (optional) Removes the border shadow
         *   around the pages. The default is false.
         */

        /**
         * Simple viewer control to display PDF content/pages.
         * @class
         * @implements {IRenderableView}
         */
        let PDFViewer = (function pdfViewer() {
            function PDFPageViewBuffer(size) {
                let data = [];
                this.push = function cachePush(view) {
                    let i = data.indexOf(view);
                    if (i >= 0) {
                        data.splice(i, 1);
                    }
                    data.push(view);
                    if (data.length > size) {
                        data.shift().destroy();
                    }
                };
                this.resize = function (newSize) {
                    size = newSize;
                    while (data.length > size) {
                        data.shift().destroy();
                    }
                };
            }

            function isSameScale(oldScale, newScale) {
                if (newScale === oldScale) {
                    return true;
                }
                if (Math.abs(newScale - oldScale) < 1e-15) {
                    // Prevent unnecessary re-rendering of all pages when the scale
                    // changes only because of limited numerical precision.
                    return true;
                }
                return false;
            }

            /**
             * @constructs PDFViewer
             * @param {PDFViewerOptions} options
             */
            function PDFViewer(options) {
                this.container = options.container;
                this.viewer = options.viewer || options.container.firstElementChild;
                this.linkService = options.linkService || new SimpleLinkService();
                this.removePageBorders = options.removePageBorders || false;

                this.defaultRenderingQueue = !options.renderingQueue;
                if (this.defaultRenderingQueue) {
                    // Custom rendering queue is not specified, using default one
                    this.renderingQueue = new PDFRenderingQueue();
                    this.renderingQueue.setViewer(this);
                } else {
                    this.renderingQueue = options.renderingQueue;
                }

                this.scroll = watchScroll(this.container, this._scrollUpdate.bind(this));
                this.updateInProgress = false;
                this.presentationModeState = PresentationModeState.UNKNOWN;
                this._resetView();

                if (this.removePageBorders) {
                    this.viewer.classList.add('removePageBorders');
                }
            }

            PDFViewer.prototype = /** @lends PDFViewer.prototype */{
                get pagesCount() {
                    return this._pages.length;
                },

                getPageView: function (index) {
                    return this._pages[index];
                },

                get currentPageNumber() {
                    return this._currentPageNumber;
                },

                set currentPageNumber(val) {
                    if (!this.pdfDocument) {
                        this._currentPageNumber = val;
                        return;
                    }

                    let event = document.createEvent('UIEvents');
                    event.initUIEvent('pagechange', true, true, window, 0);
                    event.updateInProgress = this.updateInProgress;

                    if (!(0 < val && val <= this.pagesCount)) {
                        event.pageNumber = this._currentPageNumber;
                        event.previousPageNumber = val;
                        this.container.dispatchEvent(event);
                        return;
                    }

                    event.previousPageNumber = this._currentPageNumber;
                    this._currentPageNumber = val;
                    event.pageNumber = val;
                    this.container.dispatchEvent(event);

                    // Check if the caller is `PDFViewer_update`, to avoid breaking scrolling.
                    if (this.updateInProgress) {
                        return;
                    }
                    this.scrollPageIntoView(val);
                },

                /**
                 * @returns {number}
                 */
                get currentScale() {
                    return this._currentScale !== UNKNOWN_SCALE ? this._currentScale :
                        DEFAULT_SCALE;
                },

                /**
                 * @param {number} val - Scale of the pages in percents.
                 */
                set currentScale(val) {
                    if (isNaN(val)) {
                        throw new Error('Invalid numeric scale');
                    }
                    if (!this.pdfDocument) {
                        this._currentScale = val;
                        this._currentScaleValue = val !== UNKNOWN_SCALE ? val.toString() : null;
                        return;
                    }
                    this._setScale(val, false);
                },

                /**
                 * @returns {string}
                 */
                get currentScaleValue() {
                    return this._currentScaleValue;
                },

                /**
                 * @param val - The scale of the pages (in percent or predefined value).
                 */
                set currentScaleValue(val) {
                    if (!this.pdfDocument) {
                        this._currentScale = isNaN(val) ? UNKNOWN_SCALE : val;
                        this._currentScaleValue = val;
                        return;
                    }
                    this._setScale(val, false);
                },

                /**
                 * @returns {number}
                 */
                get pagesRotation() {
                    return this._pagesRotation;
                },

                /**
                 * @param {number} rotation - The rotation of the pages (0, 90, 180, 270).
                 */
                set pagesRotation(rotation) {
                    this._pagesRotation = rotation;

                    for (let i = 0, l = this._pages.length; i < l; i++) {
                        let pageView = this._pages[i];
                        pageView.update(pageView.scale, rotation);
                    }

                    this._setScale(this._currentScaleValue, true);

                    if (this.defaultRenderingQueue) {
                        this.update();
                    }
                },

                /**
                 * @param pdfDocument {PDFDocument}
                 */
                setDocument: function (pdfDocument) {
                    if (this.pdfDocument) {
                        this._resetView();
                    }

                    this.pdfDocument = pdfDocument;
                    if (!pdfDocument) {
                        return;
                    }

                    let pagesCount = pdfDocument.numPages;
                    let self = this;

                    let resolvePagesPromise;
                    let pagesPromise = new Promise(function (resolve) {
                        resolvePagesPromise = resolve;
                    });
                    this.pagesPromise = pagesPromise;
                    pagesPromise.then(function () {
                        let event = document.createEvent('CustomEvent');
                        event.initCustomEvent('pagesloaded', true, true, {
                            pagesCount: pagesCount
                        });
                        self.container.dispatchEvent(event);
                    });

                    let isOnePageRenderedResolved = false;
                    let resolveOnePageRendered = null;
                    let onePageRendered = new Promise(function (resolve) {
                        resolveOnePageRendered = resolve;
                    });
                    this.onePageRendered = onePageRendered;

                    let bindOnAfterAndBeforeDraw = function (pageView) {
                        pageView.onBeforeDraw = function pdfViewLoadOnBeforeDraw() {
                            // Add the page to the buffer at the start of drawing. That way it can
                            // be evicted from the buffer and destroyed even if we pause its
                            // rendering.
                            self._buffer.push(this);
                        };
                        // when page is painted, using the image as thumbnail base
                        pageView.onAfterDraw = function pdfViewLoadOnAfterDraw() {
                            if (!isOnePageRenderedResolved) {
                                isOnePageRenderedResolved = true;
                                resolveOnePageRendered();
                            }
                        };
                    };

                    let firstPagePromise = pdfDocument.getPage(1);
                    this.firstPagePromise = firstPagePromise;

                    // Fetch a single page so we can get a viewport that will be the default
                    // viewport for all pages
                    return firstPagePromise.then(function (pdfPage) {
                        let scale = this.currentScale;
                        let viewport = pdfPage.getViewport(scale * CSS_UNITS);
                        for (let pageNum = 1; pageNum <= pagesCount; ++pageNum) {
                            let textLayerFactory = null;
                            if (!pdfjsLib.PDFJS.disableTextLayer) {
                                textLayerFactory = this;
                            }
                            let pageView = new PDFPageView({
                                container: this.viewer,
                                id: pageNum,
                                scale: scale,
                                defaultViewport: viewport.clone(),
                                renderingQueue: this.renderingQueue,
                                textLayerFactory: textLayerFactory,
                                annotationLayerFactory: this
                            });
                            bindOnAfterAndBeforeDraw(pageView);
                            this._pages.push(pageView);
                        }

                        let linkService = this.linkService;

                        // Fetch all the pages since the viewport is needed before printing
                        // starts to create the correct size canvas. Wait until one page is
                        // rendered so we don't tie up too many resources early on.
                        onePageRendered.then(function () {
                            if (!pdfjsLib.PDFJS.disableAutoFetch) {
                                let getPagesLeft = pagesCount;
                                for (let pageNum = 1; pageNum <= pagesCount; ++pageNum) {
                                    pdfDocument.getPage(pageNum).then(function (pageNum, pdfPage) {
                                        let pageView = self._pages[pageNum - 1];
                                        if (!pageView.pdfPage) {
                                            pageView.setPdfPage(pdfPage);
                                        }
                                        linkService.cachePageRef(pageNum, pdfPage.ref);
                                        getPagesLeft--;
                                        if (!getPagesLeft) {
                                            resolvePagesPromise();
                                        }
                                    }.bind(null, pageNum));
                                }
                            } else {
                                // XXX: Printing is semi-broken with auto fetch disabled.
                                resolvePagesPromise();
                            }
                        });

                        let event = document.createEvent('CustomEvent');
                        event.initCustomEvent('pagesinit', true, true, null);
                        self.container.dispatchEvent(event);

                        if (this.defaultRenderingQueue) {
                            this.update();
                        }

                        if (this.findController) {
                            this.findController.resolveFirstPage();
                        }
                    }.bind(this));
                },

                _resetView: function () {
                    this._pages = [];
                    this._currentPageNumber = 1;
                    this._currentScale = UNKNOWN_SCALE;
                    this._currentScaleValue = null;
                    this._buffer = new PDFPageViewBuffer(DEFAULT_CACHE_SIZE);
                    this._location = null;
                    this._pagesRotation = 0;
                    this._pagesRequests = [];

                    let container = this.viewer;
                    while (container.hasChildNodes()) {
                        container.removeChild(container.lastChild);
                    }
                },

                _scrollUpdate: function PDFViewer_scrollUpdate() {
                    if (this.pagesCount === 0) {
                        return;
                    }
                    this.update();
                    for (let i = 0, ii = this._pages.length; i < ii; i++) {
                        this._pages[i].updatePosition();
                    }
                },

                _setScaleDispatchEvent: function pdfViewer_setScaleDispatchEvent(
                    newScale, newValue, preset) {
                    let event = document.createEvent('UIEvents');
                    event.initUIEvent('scalechange', true, true, window, 0);
                    event.scale = newScale;
                    if (preset) {
                        event.presetValue = newValue;
                    }
                    this.container.dispatchEvent(event);
                },

                _setScaleUpdatePages: function pdfViewer_setScaleUpdatePages(
                    newScale, newValue, noScroll, preset) {
                    this._currentScaleValue = newValue;

                    if (isSameScale(this._currentScale, newScale)) {
                        if (preset) {
                            this._setScaleDispatchEvent(newScale, newValue, true);
                        }
                        return;
                    }

                    for (let i = 0, ii = this._pages.length; i < ii; i++) {
                        this._pages[i].update(newScale);
                    }
                    this._currentScale = newScale;

                    if (!noScroll) {
                        let page = this._currentPageNumber, dest;
                        if (this._location && !pdfjsLib.PDFJS.ignoreCurrentPositionOnZoom &&
                            !(this.isInPresentationMode || this.isChangingPresentationMode)) {
                            page = this._location.pageNumber;
                            dest = [null, {name: 'XYZ'}, this._location.left,
                                this._location.top, null];
                        }
                        this.scrollPageIntoView(page, dest);
                    }

                    this._setScaleDispatchEvent(newScale, newValue, preset);

                    if (this.defaultRenderingQueue) {
                        this.update();
                    }
                },

                _setScale: function pdfViewer_setScale(value, noScroll) {
                    let scale = parseFloat(value);

                    if (scale > 0) {
                        this._setScaleUpdatePages(scale, value, noScroll, false);
                    } else {
                        let currentPage = this._pages[this._currentPageNumber - 1];
                        if (!currentPage) {
                            return;
                        }
                        let hPadding = (this.isInPresentationMode || this.removePageBorders) ?
                            0 : SCROLLBAR_PADDING;
                        let vPadding = (this.isInPresentationMode || this.removePageBorders) ?
                            0 : VERTICAL_PADDING;
                        let pageWidthScale = (this.container.clientWidth - hPadding) /
                            currentPage.width * currentPage.scale;
                        let pageHeightScale = (this.container.clientHeight - vPadding) /
                            currentPage.height * currentPage.scale;
                        switch (value) {
                            case 'page-actual':
                                scale = 1;
                                break;
                            case 'page-width':
                                scale = pageWidthScale;
                                break;
                            case 'page-height':
                                scale = pageHeightScale;
                                break;
                            case 'page-fit':
                                scale = Math.min(pageWidthScale, pageHeightScale);
                                break;
                            case 'auto':
                                let isLandscape = (currentPage.width > currentPage.height);
                                // For pages in landscape mode, fit the page height to the viewer
                                // *unless* the page would thus become too wide to fit horizontally.
                                let horizontalScale = isLandscape ?
                                    Math.min(pageHeightScale, pageWidthScale) : pageWidthScale;
                                scale = Math.min(MAX_AUTO_SCALE, horizontalScale);
                                break;
                            default:
                                console.error('pdfViewSetScale: \'' + value +
                                    '\' is an unknown zoom value.');
                                return;
                        }
                        this._setScaleUpdatePages(scale, value, noScroll, true);
                    }
                },

                /**
                 * Scrolls page into view.
                 * @param {number} pageNumber
                 * @param {Array} dest - (optional) original PDF destination array:
                 *   <page-ref> </XYZ|FitXXX> <args..>
                 */
                scrollPageIntoView: function PDFViewer_scrollPageIntoView(pageNumber,
                                                                          dest) {
                    if (!this.pdfDocument) {
                        return;
                    }

                    let pageView = this._pages[pageNumber - 1];

                    if (this.isInPresentationMode) {
                        if (this._currentPageNumber !== pageView.id) {
                            // Avoid breaking getVisiblePages in presentation mode.
                            this.currentPageNumber = pageView.id;
                            return;
                        }
                        dest = null;
                        // Fixes the case when PDF has different page sizes.
                        this._setScale(this._currentScaleValue, true);
                    }
                    if (!dest) {
                        scrollIntoView(pageView.div);
                        return;
                    }

                    let x = 0, y = 0;
                    let width = 0, height = 0, widthScale, heightScale;
                    let changeOrientation = (pageView.rotation % 180 === 0 ? false : true);
                    let pageWidth = (changeOrientation ? pageView.height : pageView.width) /
                        pageView.scale / CSS_UNITS;
                    let pageHeight = (changeOrientation ? pageView.width : pageView.height) /
                        pageView.scale / CSS_UNITS;
                    let scale = 0;
                    switch (dest[1].name) {
                        case 'XYZ':
                            x = dest[2];
                            y = dest[3];
                            scale = dest[4];
                            // If x and/or y coordinates are not supplied, default to
                            // _top_ left of the page (not the obvious bottom left,
                            // since aligning the bottom of the intended page with the
                            // top of the window is rarely helpful).
                            x = x !== null ? x : 0;
                            y = y !== null ? y : pageHeight;
                            break;
                        case 'Fit':
                        case 'FitB':
                            scale = 'page-fit';
                            break;
                        case 'FitH':
                        case 'FitBH':
                            y = dest[2];
                            scale = 'page-width';
                            // According to the PDF spec, section 12.3.2.2, a `null` value in the
                            // parameter should maintain the position relative to the new page.
                            if (y === null && this._location) {
                                x = this._location.left;
                                y = this._location.top;
                            }
                            break;
                        case 'FitV':
                        case 'FitBV':
                            x = dest[2];
                            width = pageWidth;
                            height = pageHeight;
                            scale = 'page-height';
                            break;
                        case 'FitR':
                            x = dest[2];
                            y = dest[3];
                            width = dest[4] - x;
                            height = dest[5] - y;
                            let hPadding = this.removePageBorders ? 0 : SCROLLBAR_PADDING;
                            let vPadding = this.removePageBorders ? 0 : VERTICAL_PADDING;

                            widthScale = (this.container.clientWidth - hPadding) /
                                width / CSS_UNITS;
                            heightScale = (this.container.clientHeight - vPadding) /
                                height / CSS_UNITS;
                            scale = Math.min(Math.abs(widthScale), Math.abs(heightScale));
                            break;
                        default:
                            return;
                    }

                    if (scale && scale !== this._currentScale) {
                        this.currentScaleValue = scale;
                    } else if (this._currentScale === UNKNOWN_SCALE) {
                        this.currentScaleValue = DEFAULT_SCALE_VALUE;
                    }

                    if (scale === 'page-fit' && !dest[4]) {
                        scrollIntoView(pageView.div);
                        return;
                    }

                    let boundingRect = [
                        pageView.viewport.convertToViewportPoint(x, y),
                        pageView.viewport.convertToViewportPoint(x + width, y + height)
                    ];
                    let left = Math.min(boundingRect[0][0], boundingRect[1][0]);
                    let top = Math.min(boundingRect[0][1], boundingRect[1][1]);

                    scrollIntoView(pageView.div, {left: left, top: top});
                },

                _updateLocation: function (firstPage) {
                    let currentScale = this._currentScale;
                    let currentScaleValue = this._currentScaleValue;
                    let normalizedScaleValue =
                        parseFloat(currentScaleValue) === currentScale ?
                            Math.round(currentScale * 10000) / 100 : currentScaleValue;

                    let pageNumber = firstPage.id;
                    let pdfOpenParams = '#page=' + pageNumber;
                    pdfOpenParams += '&zoom=' + normalizedScaleValue;
                    let currentPageView = this._pages[pageNumber - 1];
                    let container = this.container;
                    let topLeft = currentPageView.getPagePoint(
                        (container.scrollLeft - firstPage.x),
                        (container.scrollTop - firstPage.y));
                    let intLeft = Math.round(topLeft[0]);
                    let intTop = Math.round(topLeft[1]);
                    pdfOpenParams += ',' + intLeft + ',' + intTop;

                    this._location = {
                        pageNumber: pageNumber,
                        scale: normalizedScaleValue,
                        top: intTop,
                        left: intLeft,
                        pdfOpenParams: pdfOpenParams
                    };
                },

                update: function PDFViewer_update() {
                    let stillFullyVisible = false;
                    let visible = this._getVisiblePages();
                    let visiblePages = visible.views;
                    if (visiblePages.length === 0) {
                        return;
                    }

                    this.updateInProgress = true;

                    let suggestedCacheSize = Math.max(DEFAULT_CACHE_SIZE,
                        2 * visiblePages.length + 1);
                    this._buffer.resize(suggestedCacheSize);

                    this.renderingQueue.renderHighestPriority(visible);

                    let currentId = this._currentPageNumber;
                    let firstPage = visible.first;

                    for (let i = 0, ii = visiblePages.length, stillFullyVisible = false; i < ii; ++i) {
                        let page = visiblePages[i];

                        if (page.percent < 100) {
                            break;
                        }
                        if (page.id === currentId) {
                            stillFullyVisible = true;
                            break;
                        }
                    }

                    if (!stillFullyVisible) {
                        currentId = visiblePages[0].id;
                    }

                    if (!this.isInPresentationMode) {
                        this.currentPageNumber = currentId;
                    }

                    this._updateLocation(firstPage);

                    this.updateInProgress = false;

                    let event = document.createEvent('UIEvents');
                    event.initUIEvent('updateviewarea', true, true, window, 0);
                    event.location = this._location;
                    this.container.dispatchEvent(event);
                },

                containsElement: function (element) {
                    return this.container.contains(element);
                },

                focus: function () {
                    this.container.focus();
                },

                get isInPresentationMode() {
                    return this.presentationModeState === PresentationModeState.FULLSCREEN;
                },

                get isChangingPresentationMode() {
                    return this.presentationModeState === PresentationModeState.CHANGING;
                },

                get isHorizontalScrollbarEnabled() {
                    return (this.isInPresentationMode ?
                        false : (this.container.scrollWidth > this.container.clientWidth));
                },

                _getVisiblePages: function () {
                    if (!this.isInPresentationMode) {
                        return getVisibleElements(this.container, this._pages, true);
                    } else {
                        // The algorithm in getVisibleElements doesn't work in all browsers and
                        // configurations when presentation mode is active.
                        let visible = [];
                        let currentPage = this._pages[this._currentPageNumber - 1];
                        visible.push({id: currentPage.id, view: currentPage});
                        return {first: currentPage, last: currentPage, views: visible};
                    }
                },

                cleanup: function () {
                    for (let i = 0, ii = this._pages.length; i < ii; i++) {
                        if (this._pages[i] &&
                            this._pages[i].renderingState !== RenderingStates.FINISHED) {
                            this._pages[i].reset();
                        }
                    }
                },

                /**
                 * @param {PDFPageView} pageView
                 * @returns {PDFPage}
                 * @private
                 */
                _ensurePdfPageLoaded: function (pageView) {
                    if (pageView.pdfPage) {
                        return Promise.resolve(pageView.pdfPage);
                    }
                    let pageNumber = pageView.id;
                    if (this._pagesRequests[pageNumber]) {
                        return this._pagesRequests[pageNumber];
                    }
                    let promise = this.pdfDocument.getPage(pageNumber).then(
                        function (pdfPage) {
                            pageView.setPdfPage(pdfPage);
                            this._pagesRequests[pageNumber] = null;
                            return pdfPage;
                        }.bind(this));
                    this._pagesRequests[pageNumber] = promise;
                    return promise;
                },

                forceRendering: function (currentlyVisiblePages) {
                    let visiblePages = currentlyVisiblePages || this._getVisiblePages();
                    let pageView = this.renderingQueue.getHighestPriority(visiblePages,
                        this._pages,
                        this.scroll.down);
                    if (pageView) {
                        this._ensurePdfPageLoaded(pageView).then(function () {
                            this.renderingQueue.renderView(pageView);
                        }.bind(this));
                        return true;
                    }
                    return false;
                },

                getPageTextContent: function (pageIndex) {
                    return this.pdfDocument.getPage(pageIndex + 1).then(function (page) {
                        return page.getTextContent({normalizeWhitespace: true});
                    });
                },

                /**
                 * @param {HTMLDivElement} textLayerDiv
                 * @param {number} pageIndex
                 * @param {PageViewport} viewport
                 * @returns {TextLayerBuilder}
                 */
                createTextLayerBuilder: function (textLayerDiv, pageIndex, viewport) {
                    return new TextLayerBuilder({
                        textLayerDiv: textLayerDiv,
                        pageIndex: pageIndex,
                        viewport: viewport,
                        findController: this.isInPresentationMode ? null : this.findController
                    });
                },

                /**
                 * @param {HTMLDivElement} pageDiv
                 * @param {PDFPage} pdfPage
                 * @returns {AnnotationLayerBuilder}
                 */
                createAnnotationLayerBuilder: function (pageDiv, pdfPage) {
                    return new AnnotationLayerBuilder({
                        pageDiv: pageDiv,
                        pdfPage: pdfPage,
                        linkService: this.linkService,
                    });
                },

                setFindController: function (findController) {
                    this.findController = findController;
                },
            };

            return PDFViewer;
        })();

        exports.PresentationModeState = PresentationModeState;
        exports.PDFViewer = PDFViewer;
    }));


    (function (root, factory) {
        {
            factory((root.pdfjsWebApp = {}), root.pdfjsWebUIUtils,
                root.pdfjsWebFirefoxCom,
                root.pdfjsWebPDFHistory, root.pdfjsWebPreferences,
                root.pdfjsWebPDFSidebar, root.pdfjsWebViewHistory,
                root.pdfjsWebPDFThumbnailViewer, root.pdfjsWebSecondaryToolbar,
                root.pdfjsWebPDFPresentationMode,
                root.pdfjsWebPDFDocumentProperties, root.pdfjsWebHandTool,
                root.pdfjsWebPDFViewer, root.pdfjsWebPDFRenderingQueue,
                root.pdfjsWebPDFLinkService,
                root.pdfjsWebOverlayManager, root.pdfjsWebPDFJS);
        }
    }(this, function (exports, uiUtilsLib, firefoxComLib,
                      pdfHistoryLib, preferencesLib, pdfSidebarLib, viewHistoryLib,
                      pdfThumbnailViewerLib, secondaryToolbarLib,
                      pdfPresentationModeLib, pdfDocumentPropertiesLib, handToolLib,
                      pdfViewerLib, pdfRenderingQueueLib, pdfLinkServiceLib,
                      overlayManagerLib, pdfjsLib) {

        let UNKNOWN_SCALE = uiUtilsLib.UNKNOWN_SCALE;
        let DEFAULT_SCALE_VALUE = uiUtilsLib.DEFAULT_SCALE_VALUE;
        let noContextMenuHandler = uiUtilsLib.noContextMenuHandler;
        let mozL10n = uiUtilsLib.mozL10n;
        let parseQueryString = uiUtilsLib.parseQueryString;
        let PDFHistory = pdfHistoryLib.PDFHistory;
        let Preferences = preferencesLib.Preferences;
        let SidebarView = pdfSidebarLib.SidebarView;
        let PDFSidebar = pdfSidebarLib.PDFSidebar;
        let ViewHistory = viewHistoryLib.ViewHistory;
        let PDFThumbnailViewer = pdfThumbnailViewerLib.PDFThumbnailViewer;
        let SecondaryToolbar = secondaryToolbarLib.SecondaryToolbar;
        let PDFPresentationMode = pdfPresentationModeLib.PDFPresentationMode;
        let PDFDocumentProperties = pdfDocumentPropertiesLib.PDFDocumentProperties;
        let HandTool = handToolLib.HandTool;
        let PresentationModeState = pdfViewerLib.PresentationModeState;
        let PDFViewer = pdfViewerLib.PDFViewer;
        let RenderingStates = pdfRenderingQueueLib.RenderingStates;
        let PDFRenderingQueue = pdfRenderingQueueLib.PDFRenderingQueue;
        let PDFLinkService = pdfLinkServiceLib.PDFLinkService;
        let OverlayManager = overlayManagerLib.OverlayManager;

        let DEFAULT_SCALE_DELTA = 1.1;
        let MIN_SCALE = 0.25;
        let MAX_SCALE = 10.0;
        let SCALE_SELECT_CONTAINER_PADDING = 8;
        let SCALE_SELECT_PADDING = 22;
        let PAGE_NUMBER_LOADING_INDICATOR = 'visiblePageIsLoading';
        let DISABLE_AUTO_FETCH_LOADING_BAR_TIMEOUT = 5000;

        function configure(PDFJS) {
            PDFJS.imageResourcesPath = '../images/';
            PDFJS.workerSrc = '../../build/pdf.worker.js';
            PDFJS.cMapUrl = '../../web/cmaps/';
            PDFJS.cMapPacked = true;
        }

        let PDFViewerApplication = {
            initialDestination: null,
            initialized: false,
            fellback: false,
            appConfig: null,
            pdfDocument: null,
            pdfLoadingTask: null,
            /** @type {PDFViewer} */
            pdfViewer: null,
            /** @type {PDFThumbnailViewer} */
            pdfThumbnailViewer: null,
            /** @type {PDFRenderingQueue} */
            pdfRenderingQueue: null,
            /** @type {PDFPresentationMode} */
            pdfPresentationMode: null,
            /** @type {PDFDocumentProperties} */
            pdfDocumentProperties: null,
            /** @type {PDFLinkService} */
            pdfLinkService: null,
            /** @type {PDFHistory} */
            pdfHistory: null,
            /** @type {PDFSidebar} */
            pdfSidebar: null,
            /** @type {ViewHistory} */
            store: null,
            pageRotation: 0,
            isInitialViewSet: false,
            animationStartedPromise: null,
            preferenceSidebarViewOnLoad: SidebarView.NONE,
            preferencePdfBugEnabled: false,
            preferenceShowPreviousViewOnLoad: true,
            preferenceDefaultZoomValue: '',
            isViewerEmbedded: (window.parent !== window),
            url: '',

            // called once when the document is loaded
            initialize: function pdfViewInitialize(appConfig) {
                configure(pdfjsLib.PDFJS);
                this.appConfig = appConfig;

                let pdfRenderingQueue = new PDFRenderingQueue();
                pdfRenderingQueue.onIdle = this.cleanup.bind(this);
                this.pdfRenderingQueue = pdfRenderingQueue;

                let pdfLinkService = new PDFLinkService();
                this.pdfLinkService = pdfLinkService;

                let container = appConfig.mainContainer;
                let viewer = appConfig.viewerContainer;
                this.pdfViewer = new PDFViewer({
                    container: container,
                    viewer: viewer,
                    renderingQueue: pdfRenderingQueue,
                    linkService: pdfLinkService,
                });
                pdfRenderingQueue.setViewer(this.pdfViewer);
                pdfLinkService.setViewer(this.pdfViewer);

                let thumbnailContainer = appConfig.sidebar.thumbnailView;
                this.pdfThumbnailViewer = new PDFThumbnailViewer({
                    container: thumbnailContainer,
                    renderingQueue: pdfRenderingQueue,
                    linkService: pdfLinkService
                });
                pdfRenderingQueue.setThumbnailViewer(this.pdfThumbnailViewer);

                Preferences.initialize();
                this.preferences = Preferences;

                this.pdfHistory = new PDFHistory({
                    linkService: pdfLinkService
                });
                pdfLinkService.setHistory(this.pdfHistory);

                this.handTool = new HandTool({
                    container: container,
                    toggleHandTool: appConfig.secondaryToolbar.toggleHandTool
                });

                this.pdfDocumentProperties =
                    new PDFDocumentProperties(appConfig.documentProperties);

                SecondaryToolbar.initialize(appConfig.secondaryToolbar);
                this.secondaryToolbar = SecondaryToolbar;

                if (this.supportsFullscreen) {
                    let toolbar = SecondaryToolbar;
                    this.pdfPresentationMode = new PDFPresentationMode({
                        container: container,
                        viewer: viewer,
                        pdfViewer: this.pdfViewer,
                        contextMenuItems: [
                            {
                                element: appConfig.fullscreen.contextFirstPage,
                                handler: toolbar.firstPageClick.bind(toolbar)
                            },
                            {
                                element: appConfig.fullscreen.contextLastPage,
                                handler: toolbar.lastPageClick.bind(toolbar)
                            },
                            {
                                element: appConfig.fullscreen.contextPageRotateCw,
                                handler: toolbar.pageRotateCwClick.bind(toolbar)
                            },
                            {
                                element: appConfig.fullscreen.contextPageRotateCcw,
                                handler: toolbar.pageRotateCcwClick.bind(toolbar)
                            }
                        ]
                    });
                }

                // FIXME better PDFSidebar constructor parameters
                let sidebarConfig = Object.create(appConfig.sidebar);
                sidebarConfig.pdfViewer = this.pdfViewer;
                sidebarConfig.pdfThumbnailViewer = this.pdfThumbnailViewer;
                this.pdfSidebar = new PDFSidebar(sidebarConfig);
                this.pdfSidebar.onToggled = this.forceRendering.bind(this);

                let self = this;
                let PDFJS = pdfjsLib.PDFJS;
                let initializedPromise = Promise.all([
                    Preferences.get('enableWebGL').then(function resolved(value) {
                        PDFJS.disableWebGL = !value;
                    }),
                    Preferences.get('sidebarViewOnLoad').then(function resolved(value) {
                        self.preferenceSidebarViewOnLoad = value;
                    }),
                    Preferences.get('pdfBugEnabled').then(function resolved(value) {
                        self.preferencePdfBugEnabled = value;
                    }),
                    Preferences.get('showPreviousViewOnLoad').then(function resolved(value) {
                        self.preferenceShowPreviousViewOnLoad = value;
                    }),
                    Preferences.get('defaultZoomValue').then(function resolved(value) {
                        self.preferenceDefaultZoomValue = value;
                    }),
                    Preferences.get('disableTextLayer').then(function resolved(value) {
                        if (PDFJS.disableTextLayer === true) {
                            return;
                        }
                        PDFJS.disableTextLayer = value;
                    }),
                    Preferences.get('disableRange').then(function resolved(value) {
                        if (PDFJS.disableRange === true) {
                            return;
                        }
                        PDFJS.disableRange = value;
                    }),
                    Preferences.get('disableStream').then(function resolved(value) {
                        if (PDFJS.disableStream === true) {
                            return;
                        }
                        PDFJS.disableStream = value;
                    }),
                    Preferences.get('disableAutoFetch').then(function resolved(value) {
                        PDFJS.disableAutoFetch = value;
                    }),
                    Preferences.get('disableFontFace').then(function resolved(value) {
                        if (PDFJS.disableFontFace === true) {
                            return;
                        }
                        PDFJS.disableFontFace = value;
                    }),
                    Preferences.get('useOnlyCssZoom').then(function resolved(value) {
                        PDFJS.useOnlyCssZoom = value;
                    }),
                    Preferences.get('externalLinkTarget').then(function resolved(value) {
                        if (PDFJS.isExternalLinkTargetSet()) {
                            return;
                        }
                        PDFJS.externalLinkTarget = value;
                    }),
                    // TODO move more preferences and other async stuff here
                ]).catch(function (reason) {
                });

                return initializedPromise.then(function () {
                    if (self.isViewerEmbedded && !PDFJS.isExternalLinkTargetSet()) {
                        // Prevent external links from "replacing" the viewer,
                        // when it's embedded in e.g. an iframe or an object.
                        PDFJS.externalLinkTarget = PDFJS.LinkTarget.TOP;
                    }

                    self.initialized = true;
                });
            },

            run: function pdfViewRun(config) {
                this.initialize(config).then(webViewerInitialized);
            },

            zoomIn: function pdfViewZoomIn(ticks) {
                let newScale = this.pdfViewer.currentScale;
                do {
                    newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
                    newScale = Math.ceil(newScale * 10) / 10;
                    newScale = Math.min(MAX_SCALE, newScale);
                } while (--ticks > 0 && newScale < MAX_SCALE);
                this.pdfViewer.currentScaleValue = newScale;
            },

            zoomOut: function pdfViewZoomOut(ticks) {
                let newScale = this.pdfViewer.currentScale;
                do {
                    newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
                    newScale = Math.floor(newScale * 10) / 10;
                    newScale = Math.max(MIN_SCALE, newScale);
                } while (--ticks > 0 && newScale > MIN_SCALE);
                this.pdfViewer.currentScaleValue = newScale;
            },

            get pagesCount() {
                return this.pdfDocument.numPages;
            },

            set page(val) {
                this.pdfLinkService.page = val;
            },

            get page() { // TODO remove
                return this.pdfLinkService.page;
            },

            get supportsFullscreen() {
                let doc = document.documentElement;
                let support = !!(doc.requestFullscreen || doc.mozRequestFullScreen ||
                    doc.webkitRequestFullScreen || doc.msRequestFullscreen);

                if (document.fullscreenEnabled === false ||
                    document.mozFullScreenEnabled === false ||
                    document.webkitFullscreenEnabled === false ||
                    document.msFullscreenEnabled === false) {
                    support = false;
                }
                if (support && pdfjsLib.PDFJS.disableFullscreen === true) {
                    support = false;
                }

                return pdfjsLib.shadow(this, 'supportsFullscreen', support);
            },

            get supportedMouseWheelZoomModifierKeys() {
                let support = {
                    ctrlKey: true,
                    metaKey: true,
                };

                return pdfjsLib.shadow(this, 'supportedMouseWheelZoomModifierKeys',
                    support);
            },


            setTitleUsingUrl: function pdfViewSetTitleUsingUrl(url) {
                this.url = url;
                try {
                    this.setTitle(decodeURIComponent(
                        pdfjsLib.getFilenameFromUrl(url)) || url);
                } catch (e) {
                    // decodeURIComponent may throw URIError,
                    // fall back to using the unprocessed url in that case
                    this.setTitle(url);
                }
            },

            setTitle: function pdfViewSetTitle(title) {
                if (this.isViewerEmbedded) {
                    // Embedded PDF viewers should not be changing their parent page's title.
                    return;
                }
                document.title = title;
            },

            /**
             * Closes opened PDF document.
             * @returns {Promise} - Returns the promise, which is resolved when all
             *                      destruction is completed.
             */
            close: function pdfViewClose() {
                let errorWrapper = this.appConfig.errorWrapper.container;
                errorWrapper.setAttribute('hidden', 'true');

                if (!this.pdfLoadingTask) {
                    return Promise.resolve();
                }

                let promise = this.pdfLoadingTask.destroy();
                this.pdfLoadingTask = null;

                if (this.pdfDocument) {
                    this.pdfDocument = null;

                    this.pdfThumbnailViewer.setDocument(null);
                    this.pdfViewer.setDocument(null);
                    this.pdfLinkService.setDocument(null, null);
                }
                this.store = null;
                this.isInitialViewSet = false;

                this.pdfSidebar.reset();

                if (typeof PDFBug !== 'undefined') {
                    PDFBug.cleanup();
                }
                return promise;
            },

            /**
             * Opens PDF document specified by URL or array with additional arguments.
             * @param {string|TypedArray|ArrayBuffer} file - PDF location or binary data.
             * @param {Object} args - (optional) Additional arguments for the getDocument
             *                        call, e.g. HTTP headers ('httpHeaders') or
             *                        alternative data transport ('range').
             * @returns {Promise} - Returns the promise, which is resolved when document
             *                      is opened.
             */
            open: function pdfViewOpen(file, args) {
                let scale = 0;
                if (arguments.length > 2 || typeof args === 'number') {
                    console.warn('Call of open() with obsolete signature.');
                    if (typeof args === 'number') {
                        scale = args; // scale argument was found
                    }
                    args = arguments[4] || null;
                    if (arguments[3] && typeof arguments[3] === 'object') {
                        // The pdfDataRangeTransport argument is present.
                        args = Object.create(args);
                        args.range = arguments[3];
                    }
                }

                if (this.pdfLoadingTask) {
                    // We need to destroy already opened document.
                    return this.close().then(function () {
                        // Reload the preferences if a document was previously opened.
                        Preferences.reload();
                        // ... and repeat the open() call.
                        return this.open(file, args);
                    }.bind(this));
                }

                let parameters = Object.create(null);
                if (typeof file === 'string') { // URL
                    this.setTitleUsingUrl(file);
                    parameters.url = file;
                } else if (file && 'byteLength' in file) { // ArrayBuffer
                    parameters.data = file;
                } else if (file.url && file.originalUrl) {
                    this.setTitleUsingUrl(file.originalUrl);
                    parameters.url = file.url;
                }
                if (args) {
                    for (let prop in args) {
                        parameters[prop] = args[prop];
                    }
                }

                let self = this;

                let loadingTask = pdfjsLib.getDocument(parameters);
                this.pdfLoadingTask = loadingTask;

                loadingTask.onProgress = function getDocumentProgress(progressData) {
                    self.progress(progressData.loaded / progressData.total);
                };

                // Listen for unsupported features to trigger the fallback UI.
                loadingTask.onUnsupportedFeature = this.fallback.bind(this);

                let result = loadingTask.promise.then(
                    function getDocumentCallback(pdfDocument) {
                        self.load(pdfDocument, scale);
                    },
                    function getDocumentError(exception) {
                        let message = exception && exception.message;
                        let loadingErrorMessage = mozL10n.get('loading_error', null,
                            'An error occurred while loading the PDF.');

                        if (exception instanceof pdfjsLib.InvalidPDFException) {
                            // change error message also for other builds
                            loadingErrorMessage = mozL10n.get('invalid_file_error', null,
                                'Invalid or corrupted PDF file.');
                        } else if (exception instanceof pdfjsLib.MissingPDFException) {
                            // special message for missing PDF's
                            loadingErrorMessage = mozL10n.get('missing_file_error', null,
                                'Missing PDF file.');
                        } else if (exception instanceof pdfjsLib.UnexpectedResponseException) {
                            loadingErrorMessage = mozL10n.get('unexpected_response_error', null,
                                'Unexpected server response.');
                        }

                        let moreInfo = {
                            message: message
                        };
                        self.error(loadingErrorMessage, moreInfo);

                        throw new Error(loadingErrorMessage);
                    }
                );

                if (args && args.length) {
                    PDFViewerApplication.pdfDocumentProperties.setFileSize(args.length);
                }
                return result;
            },

            fallback: function pdfViewFallback(featureId) {
            },

            /**
             * Show the error box.
             * @param {String} message A message that is human readable.
             * @param {Object} moreInfo (optional) Further information about the error
             *                            that is more technical.  Should have a 'message'
             *                            and optionally a 'stack' property.
             */
            error: function pdfViewError(message, moreInfo) {
                let moreInfoText = mozL10n.get('error_version_info',
                    {version: pdfjsLib.version || '?', build: pdfjsLib.build || '?'},
                    'PDF.js v{{version}} (build: {{build}})') + '\n';
                if (moreInfo) {
                    moreInfoText +=
                        mozL10n.get('error_message', {message: moreInfo.message},
                            'Message: {{message}}');
                    if (moreInfo.stack) {
                        moreInfoText += '\n' +
                            mozL10n.get('error_stack', {stack: moreInfo.stack},
                                'Stack: {{stack}}');
                    } else {
                        if (moreInfo.filename) {
                            moreInfoText += '\n' +
                                mozL10n.get('error_file', {file: moreInfo.filename},
                                    'File: {{file}}');
                        }
                        if (moreInfo.lineNumber) {
                            moreInfoText += '\n' +
                                mozL10n.get('error_line', {line: moreInfo.lineNumber},
                                    'Line: {{line}}');
                        }
                    }
                }

                let errorWrapperConfig = this.appConfig.errorWrapper;
                let errorWrapper = errorWrapperConfig.container;
                errorWrapper.removeAttribute('hidden');

                let errorMessage = errorWrapperConfig.errorMessage;
                errorMessage.textContent = message;

                let closeButton = errorWrapperConfig.closeButton;
                closeButton.onclick = function () {
                    errorWrapper.setAttribute('hidden', 'true');
                };

                let errorMoreInfo = errorWrapperConfig.errorMoreInfo;
                let moreInfoButton = errorWrapperConfig.moreInfoButton;
                let lessInfoButton = errorWrapperConfig.lessInfoButton;
                moreInfoButton.onclick = function () {
                    errorMoreInfo.removeAttribute('hidden');
                    moreInfoButton.setAttribute('hidden', 'true');
                    lessInfoButton.removeAttribute('hidden');
                    errorMoreInfo.style.height = errorMoreInfo.scrollHeight + 'px';
                };
                lessInfoButton.onclick = function () {
                    errorMoreInfo.setAttribute('hidden', 'true');
                    moreInfoButton.removeAttribute('hidden');
                    lessInfoButton.setAttribute('hidden', 'true');
                };
                moreInfoButton.oncontextmenu = noContextMenuHandler;
                lessInfoButton.oncontextmenu = noContextMenuHandler;
                closeButton.oncontextmenu = noContextMenuHandler;
                moreInfoButton.removeAttribute('hidden');
                lessInfoButton.setAttribute('hidden', 'true');
                errorMoreInfo.value = moreInfoText;
            },


            load: function pdfViewLoad(pdfDocument, scale) {
                let self = this;
                scale = scale || UNKNOWN_SCALE;

                this.pdfDocument = pdfDocument;

                this.pdfDocumentProperties.setDocumentAndUrl(pdfDocument, this.url);

                let pagesCount = pdfDocument.numPages;
                let toolbarConfig = this.appConfig.toolbar;
                toolbarConfig.numPages.textContent =
                    mozL10n.get('page_of', {pageCount: pagesCount}, 'of {{pageCount}}');
                toolbarConfig.pageNumber.max = pagesCount;

                let id = this.documentFingerprint = pdfDocument.fingerprint;
                let store = this.store = new ViewHistory(id);

                let baseDocumentUrl = null;
                this.pdfLinkService.setDocument(pdfDocument, baseDocumentUrl);

                let pdfViewer = this.pdfViewer;
                pdfViewer.currentScale = scale;
                pdfViewer.setDocument(pdfDocument);
                let firstPagePromise = pdfViewer.firstPagePromise;
                let pagesPromise = pdfViewer.pagesPromise;

                this.pageRotation = 0;

                this.pdfThumbnailViewer.setDocument(pdfDocument);

                firstPagePromise.then(function (pdfPage) {

                    if (!pdfjsLib.PDFJS.disableHistory && !self.isViewerEmbedded) {
                        // The browsing history is only enabled when the viewer is standalone,
                        // i.e. not when it is embedded in a web page.
                        if (!self.preferenceShowPreviousViewOnLoad) {
                            self.pdfHistory.clearHistoryState();
                        }
                        self.pdfHistory.initialize(self.documentFingerprint);

                        if (self.pdfHistory.initialDestination) {
                            self.initialDestination = self.pdfHistory.initialDestination;
                        }
                    }

                    let initialParams = {
                        destination: self.initialDestination,
                        hash: null,
                    };

                    store.initializedPromise.then(function resolved() {
                        let storedHash = null, sidebarView = null;
                        if (self.preferenceShowPreviousViewOnLoad &&
                            store.get('exists', false)) {
                            let pageNum = store.get('page', '1');
                            let zoom = self.preferenceDefaultZoomValue ||
                                store.get('zoom', DEFAULT_SCALE_VALUE);
                            let left = store.get('scrollLeft', '0');
                            let top = store.get('scrollTop', '0');

                            storedHash = 'page=' + pageNum + '&zoom=' + zoom + ',' +
                                left + ',' + top;

                            sidebarView = store.get('sidebarView', SidebarView.NONE);
                        } else if (self.preferenceDefaultZoomValue) {
                            storedHash = 'page=1&zoom=' + self.preferenceDefaultZoomValue;
                        }
                        self.setInitialView(storedHash,
                            {scale: scale, sidebarView: sidebarView});

                        initialParams.hash = storedHash;

                        // Make all navigation keys work on document load,
                        // unless the viewer is embedded in a web page.
                        if (!self.isViewerEmbedded) {
                            self.pdfViewer.focus();
                        }
                    }, function rejected(reason) {
                        console.error(reason);
                        self.setInitialView(null, {scale: scale});
                    });

                    // For documents with different page sizes,
                    // ensure that the correct location becomes visible on load.
                    pagesPromise.then(function resolved() {
                        if (self.hasEqualPageSizes) {
                            return;
                        }
                        self.initialDestination = initialParams.destination;

                        self.pdfViewer.currentScaleValue = self.pdfViewer.currentScaleValue;
                        self.setInitialView(initialParams.hash);
                    });
                });

                pdfDocument.getMetadata().then(function (data) {
                    let info = data.info, metadata = data.metadata;
                    self.documentInfo = info;
                    self.metadata = metadata;

                    // Provides some basic debug information
                    /*    console.log('PDF ' + pdfDocument.fingerprint + ' [' +
                            info.PDFFormatVersion + ' ' + (info.Producer || '-').trim() +
                            ' / ' + (info.Creator || '-').trim() + ']' +
                            ' (PDF.js: ' + (pdfjsLib.version || '-') +
                            (!pdfjsLib.PDFJS.disableWebGL ? ' [WebGL]' : '') + ')');*/

                    let pdfTitle;
                    if (metadata && metadata.has('dc:title')) {
                        let title = metadata.get('dc:title');
                        // Ghostscript sometimes return 'Untitled', sets the title to 'Untitled'
                        if (title !== 'Untitled') {
                            pdfTitle = title;
                        }
                    }

                    if (!pdfTitle && info && info['Title']) {
                        pdfTitle = info['Title'];
                    }

                    if (pdfTitle) {
                        self.setTitle(pdfTitle + ' - ' + document.title);
                    }

                    if (info.IsAcroFormPresent) {
                        console.warn('Warning: AcroForm/XFA is not supported');
                        self.fallback(pdfjsLib.UNSUPPORTED_FEATURES.forms);
                    }

                });
            },

            setInitialView: function pdfViewSetInitialView(storedHash, options) {
                let scale = options && options.scale;
                let sidebarView = options && options.sidebarView;

                this.isInitialViewSet = true;

                // When opening a new file, when one is already loaded in the viewer,
                // ensure that the 'pageNumber' element displays the correct value.
                this.appConfig.toolbar.pageNumber.value = this.pdfViewer.currentPageNumber;

                this.pdfSidebar.setInitialView(this.preferenceSidebarViewOnLoad ||
                    (sidebarView | 0));

                if (this.initialDestination) {
                    this.pdfLinkService.navigateTo(this.initialDestination);
                    this.initialDestination = null;
                } else if (storedHash) {
                    this.pdfLinkService.setHash(storedHash);
                } else if (scale) {
                    this.pdfViewer.currentScaleValue = scale;
                    this.page = 1;
                }

                if (!this.pdfViewer.currentScaleValue) {
                    // Setting the default one.
                    this.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
                }
            },

            cleanup: function pdfViewCleanup() {
                if (!this.pdfDocument) {
                    return; // run cleanup when document is loaded
                }
                this.pdfViewer.cleanup();
                this.pdfThumbnailViewer.cleanup();
                this.pdfDocument.cleanup();
            },

            forceRendering: function pdfViewForceRendering() {
                this.pdfRenderingQueue.isThumbnailViewEnabled =
                    this.pdfSidebar.isThumbnailViewVisible;
                this.pdfRenderingQueue.renderHighestPriority();
            },

            // Whether all pages of the PDF have the same width and height.
            get hasEqualPageSizes() {
                let firstPage = this.pdfViewer.getPageView(0);
                for (let i = 1, ii = this.pagesCount; i < ii; ++i) {
                    let pageView = this.pdfViewer.getPageView(i);
                    if (pageView.width !== firstPage.width ||
                        pageView.height !== firstPage.height) {
                        return false;
                    }
                }
                return true;
            },

            rotatePages: function pdfViewRotatePages(delta) {
                let pageNumber = this.page;
                this.pageRotation = (this.pageRotation + 360 + delta) % 360;
                this.pdfViewer.pagesRotation = this.pageRotation;
                this.pdfThumbnailViewer.pagesRotation = this.pageRotation;

                this.forceRendering();

                this.pdfViewer.scrollPageIntoView(pageNumber);
            },

            requestPresentationMode: function pdfViewRequestPresentationMode() {
                if (!this.pdfPresentationMode) {
                    return;
                }
                this.pdfPresentationMode.request();
            },

            /**
             * @param {number} delta - The delta value from the mouse event.
             */
            scrollPresentationMode: function pdfViewScrollPresentationMode(delta) {
                if (!this.pdfPresentationMode) {
                    return;
                }
                this.pdfPresentationMode.mouseScroll(delta);
            }
        };

        let HOSTED_VIEWER_ORIGINS = ['null',
            'http://mozilla.github.io', 'https://mozilla.github.io'];

        function validateFileURL(file) {
            try {
                let viewerOrigin = new URL(window.location.href).origin || 'null';
                if (HOSTED_VIEWER_ORIGINS.indexOf(viewerOrigin) >= 0) {
                    // Hosted or local viewer, allow for any file locations
                    return;
                }
                let fileOrigin = new URL(file, window.location.href).origin;
                // Removing of the following line will not guarantee that the viewer will
                // start accepting URLs from foreign origin -- CORS headers on the remote
                // server must be properly configured.
                if (fileOrigin !== viewerOrigin) {
                    throw new Error('file origin does not match viewer\'s');
                }
            } catch (e) {
                let message = e && e.message;
                let loadingErrorMessage = mozL10n.get('loading_error', null,
                    'An error occurred while loading the PDF.');

                let moreInfo = {
                    message: message
                };
                PDFViewerApplication.error(loadingErrorMessage, moreInfo);
                throw e;
            }
        }

        function webViewerInitialized() {
            let queryString = document.location.search.substring(1);
            let params = parseQueryString(queryString);
            let file = 'file' in params ? params.file : DEFAULT_URL;
            validateFileURL(file);

            let appConfig = PDFViewerApplication.appConfig;


            let PDFJS = pdfjsLib.PDFJS;

            if (PDFViewerApplication.preferencePdfBugEnabled) {
                // Special debugging flags in the hash section of the URL.
                let hash = document.location.hash.substring(1);
                let hashParams = parseQueryString(hash);

                if ('disableworker' in hashParams) {
                    PDFJS.disableWorker = (hashParams['disableworker'] === 'true');
                }
                if ('disablerange' in hashParams) {
                    PDFJS.disableRange = (hashParams['disablerange'] === 'true');
                }
                if ('disablestream' in hashParams) {
                    PDFJS.disableStream = (hashParams['disablestream'] === 'true');
                }
                if ('disableautofetch' in hashParams) {
                    PDFJS.disableAutoFetch = (hashParams['disableautofetch'] === 'true');
                }
                if ('disablefontface' in hashParams) {
                    PDFJS.disableFontFace = (hashParams['disablefontface'] === 'true');
                }
                if ('disablehistory' in hashParams) {
                    PDFJS.disableHistory = (hashParams['disablehistory'] === 'true');
                }
                if ('webgl' in hashParams) {
                    PDFJS.disableWebGL = (hashParams['webgl'] !== 'true');
                }
                if ('useonlycsszoom' in hashParams) {
                    PDFJS.useOnlyCssZoom = (hashParams['useonlycsszoom'] === 'true');
                }
                if ('verbosity' in hashParams) {
                    PDFJS.verbosity = hashParams['verbosity'] | 0;
                }
                if ('ignorecurrentpositiononzoom' in hashParams) {
                    PDFJS.ignoreCurrentPositionOnZoom =
                        (hashParams['ignorecurrentpositiononzoom'] === 'true');
                }
                if ('locale' in hashParams) {
                    PDFJS.locale = hashParams['locale'];
                }
                if ('textlayer' in hashParams) {
                    switch (hashParams['textlayer']) {
                        case 'off':
                            PDFJS.disableTextLayer = true;
                            break;
                        case 'visible':
                        case 'shadow':
                        case 'hover':
                            let viewer = appConfig.viewerContainer;
                            viewer.classList.add('textLayer-' + hashParams['textlayer']);
                            break;
                    }
                }
                if ('pdfbug' in hashParams) {
                    PDFJS.pdfBug = true;
                    let pdfBug = hashParams['pdfbug'];
                    let enabled = pdfBug.split(',');
                    PDFBug.enable(enabled);
                    PDFBug.init(pdfjsLib, appConfig.mainContainer);
                }
            }

            mozL10n.setLanguage(PDFJS.locale);

            if (!PDFViewerApplication.supportsFullscreen) {
                appConfig.toolbar.presentationModeButton.classList.add('hidden');
                appConfig.secondaryToolbar.presentationModeButton.classList.add('hidden');
            }

            // Suppress context menus for some controls
            appConfig.toolbar.scaleSelect.oncontextmenu = noContextMenuHandler;

            appConfig.sidebar.mainContainer.addEventListener('transitionend',
                function (e) {
                    if (e.target === /* mainContainer */ this) {
                        let event = document.createEvent('UIEvents');
                        event.initUIEvent('resize', false, false, window, 0);
                        window.dispatchEvent(event);
                    }
                }, true);

            appConfig.sidebar.toggleButton.addEventListener('click',
                function () {
                    PDFViewerApplication.pdfSidebar.toggle();
                });

            appConfig.toolbar.previous.addEventListener('click',
                function () {
                    PDFViewerApplication.page--;
                });

            appConfig.toolbar.next.addEventListener('click',
                function () {
                    PDFViewerApplication.page++;
                });

            appConfig.toolbar.zoomIn.addEventListener('click',
                function () {
                    PDFViewerApplication.zoomIn();
                });

            appConfig.toolbar.zoomOut.addEventListener('click',
                function () {
                    PDFViewerApplication.zoomOut();
                });

            appConfig.toolbar.pageNumber.addEventListener('click', function () {
                this.select();
            });

            appConfig.toolbar.pageNumber.addEventListener('change', function () {
                // Handle the user inputting a floating point number.
                PDFViewerApplication.page = (this.value | 0);

                if (this.value !== (this.value | 0).toString()) {
                    this.value = PDFViewerApplication.page;
                }
            });

            appConfig.toolbar.scaleSelect.addEventListener('change', function () {
                if (this.value === 'custom') {
                    return;
                }
                PDFViewerApplication.pdfViewer.currentScaleValue = this.value;
            });

            appConfig.toolbar.presentationModeButton.addEventListener('click',
                SecondaryToolbar.presentationModeClick.bind(SecondaryToolbar));


            if (file && file.lastIndexOf('file:', 0) === 0) {
                // file:-scheme. Load the contents in the main thread because QtWebKit
                // cannot load file:-URLs in a Web Worker. file:-URLs are usually loaded
                // very quickly, so there is no need to set up progress event listeners.
                PDFViewerApplication.setTitleUsingUrl(file);
                let xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    PDFViewerApplication.open(new Uint8Array(xhr.response));
                };
                try {
                    xhr.open('GET', file);
                    xhr.responseType = 'arraybuffer';
                    xhr.send();
                } catch (e) {
                    PDFViewerApplication.error(mozL10n.get('loading_error', null,
                        'An error occurred while loading the PDF.'), e);
                }
                return;
            }

            if (file) {
                PDFViewerApplication.open(file);
            }
        }

        document.addEventListener('pagerendered', function (e) {
            let pageNumber = e.detail.pageNumber;
            let pageIndex = pageNumber - 1;
            let pageView = PDFViewerApplication.pdfViewer.getPageView(pageIndex);

            // Use the rendered page to set the corresponding thumbnail image.
            if (PDFViewerApplication.pdfSidebar.isThumbnailViewVisible) {
                let thumbnailView = PDFViewerApplication.pdfThumbnailViewer.getThumbnail(pageIndex);
                thumbnailView.setImage(pageView);
            }

            if (pdfjsLib.PDFJS.pdfBug && Stats.enabled && pageView.stats) {
                Stats.add(pageNumber, pageView.stats);
            }

            if (pageView.error) {
                PDFViewerApplication.error(mozL10n.get('rendering_error', null,
                    'An error occurred while rendering the page.'), pageView.error);
            }

            // If the page is still visible when it has finished rendering,
            // ensure that the page number input loading indicator is hidden.
            if (pageNumber === PDFViewerApplication.page) {
                let pageNumberInput = PDFViewerApplication.appConfig.toolbar.pageNumber;
                pageNumberInput.classList.remove(PAGE_NUMBER_LOADING_INDICATOR);
            }

        }, true);

        document.addEventListener('textlayerrendered', function (e) {
            let pageIndex = e.detail.pageNumber - 1;
            let pageView = PDFViewerApplication.pdfViewer.getPageView(pageIndex);

        }, true);

        document.addEventListener('pagemode', function (evt) {
            if (!PDFViewerApplication.initialized) {
                return;
            }
            // Handle the 'pagemode' hash parameter, see also `PDFLinkService_setHash`.
            let mode = evt.detail.mode, view;
            switch (mode) {
                case 'thumbs':
                    view = SidebarView.THUMBS;
                    break;
                case 'none':
                    view = SidebarView.NONE;
                    break;
                default:
                    console.error('Invalid "pagemode" hash parameter: ' + mode);
                    return;
            }
            PDFViewerApplication.pdfSidebar.switchView(view, /* forceOpen = */ true);
        }, true);

        document.addEventListener('namedaction', function (e) {
            if (!PDFViewerApplication.initialized) {
                return;
            }
            // Processing couple of named actions that might be useful.
            // See also PDFLinkService.executeNamedAction
            let action = e.detail.action;
            switch (action) {
                case 'GoToPage':
                    PDFViewerApplication.appConfig.toolbar.pageNumber.focus();
                    break;
            }
        }, true);

        window.addEventListener('presentationmodechanged', function (e) {
            let active = e.detail.active;
            let switchInProgress = e.detail.switchInProgress;
            PDFViewerApplication.pdfViewer.presentationModeState =
                switchInProgress ? PresentationModeState.CHANGING :
                    active ? PresentationModeState.FULLSCREEN : PresentationModeState.NORMAL;
        });

        window.addEventListener('sidebarviewchanged', function (evt) {
            if (!PDFViewerApplication.initialized) {
                return;
            }
            PDFViewerApplication.pdfRenderingQueue.isThumbnailViewEnabled =
                PDFViewerApplication.pdfSidebar.isThumbnailViewVisible;

            let store = PDFViewerApplication.store;
            if (!store || !PDFViewerApplication.isInitialViewSet) {
                // Only update the storage when the document has been loaded *and* rendered.
                return;
            }
            store.initializedPromise.then(function () {
                store.set('sidebarView', evt.detail.view).catch(function () {
                });
            });
        }, true);

        window.addEventListener('updateviewarea', function (evt) {
            if (!PDFViewerApplication.initialized) {
                return;
            }
            let location = evt.location, store = PDFViewerApplication.store;

            if (store) {
                store.initializedPromise.then(function () {
                    store.setMultiple({
                        'exists': true,
                        'page': location.pageNumber,
                        'zoom': location.scale,
                        'scrollLeft': location.left,
                        'scrollTop': location.top,
                    }).catch(function () { /* unable to write to storage */
                    });
                });
            }

            // Show/hide the loading indicator in the page number input element.
            let pageNumberInput = PDFViewerApplication.appConfig.toolbar.pageNumber;
            let currentPage =
                PDFViewerApplication.pdfViewer.getPageView(PDFViewerApplication.page - 1);

            if (currentPage.renderingState === RenderingStates.FINISHED) {
                pageNumberInput.classList.remove(PAGE_NUMBER_LOADING_INDICATOR);
            } else {
                pageNumberInput.classList.add(PAGE_NUMBER_LOADING_INDICATOR);
            }
        }, true);

        window.addEventListener('resize', function webViewerResize(evt) {
            if (PDFViewerApplication.initialized) {
                let currentScaleValue = PDFViewerApplication.pdfViewer.currentScaleValue;
                if (currentScaleValue === 'auto' ||
                    currentScaleValue === 'page-fit' ||
                    currentScaleValue === 'page-width') {
                    // Note: the scale is constant for 'page-actual'.
                    PDFViewerApplication.pdfViewer.currentScaleValue = currentScaleValue;
                } else if (!currentScaleValue) {
                    // Normally this shouldn't happen, but if the scale wasn't initialized
                    // we set it to the default value in order to prevent any issues.
                    // (E.g. the document being rendered with the wrong scale on load.)
                    PDFViewerApplication.pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
                }
                PDFViewerApplication.pdfViewer.update();
            }

            // Set the 'max-height' CSS property of the secondary toolbar.
            SecondaryToolbar.setMaxHeight(PDFViewerApplication.appConfig.mainContainer);
        });

        window.addEventListener('hashchange', function webViewerHashchange(evt) {
            if (PDFViewerApplication.pdfHistory.isHashChangeUnlocked) {
                let hash = document.location.hash.substring(1);
                if (!hash) {
                    return;
                }
                if (PDFViewerApplication.isInitialViewSet) {
                    PDFViewerApplication.pdfLinkService.setHash(hash);
                }
            }
        });

        window.addEventListener('change', function webViewerChange(evt) {
            let files = evt.target.files;
            if (!files || files.length === 0) {
                return;
            }
            let file = files[0];

            if (!pdfjsLib.PDFJS.disableCreateObjectURL &&
                typeof URL !== 'undefined' && URL.createObjectURL) {
                PDFViewerApplication.open(URL.createObjectURL(file));
            } else {
                // Read the local file into a Uint8Array.
                let fileReader = new FileReader();
                fileReader.onload = function webViewerChangeFileReaderOnload(evt) {
                    let buffer = evt.target.result;
                    let uint8Array = new Uint8Array(buffer);
                    PDFViewerApplication.open(uint8Array);
                };
                fileReader.readAsArrayBuffer(file);
            }

            PDFViewerApplication.setTitleUsingUrl(file.name);

            // URL does not reflect proper document location - hiding some icons.
            let appConfig = PDFViewerApplication.appConfig;
        }, true);

        function selectScaleOption(value) {
            let options = PDFViewerApplication.appConfig.toolbar.scaleSelect.options;
            let predefinedValueFound = false;
            for (let i = 0, ii = options.length; i < ii; i++) {
                let option = options[i];
                if (option.value !== value) {
                    option.selected = false;
                    continue;
                }
                option.selected = true;
                predefinedValueFound = true;
            }
            return predefinedValueFound;
        }

        window.addEventListener('localized', function localized(evt) {
            document.getElementsByTagName('html')[0].dir = mozL10n.getDirection();

            PDFViewerApplication.animationStartedPromise.then(function () {
                // Adjust the width of the zoom box to fit the content.
                // Note: If the window is narrow enough that the zoom box is not visible,
                //       we temporarily show it to be able to adjust its width.
                let container = PDFViewerApplication.appConfig.toolbar.scaleSelectContainer;
                if (container.clientWidth === 0) {
                    container.setAttribute('style', 'display: inherit;');
                }
                if (container.clientWidth > 0) {
                    let select = PDFViewerApplication.appConfig.toolbar.scaleSelect;
                    select.setAttribute('style', 'min-width: inherit;');
                    let width = select.clientWidth + SCALE_SELECT_CONTAINER_PADDING;
                    select.setAttribute('style', 'min-width: ' +
                        (width + SCALE_SELECT_PADDING) + 'px;');
                    container.setAttribute('style', 'min-width: ' + width + 'px; ' +
                        'max-width: ' + width + 'px;');
                }

                // Set the 'max-height' CSS property of the secondary toolbar.
                SecondaryToolbar.setMaxHeight(PDFViewerApplication.appConfig.mainContainer);
            });
        }, true);

        window.addEventListener('scalechange', function scalechange(evt) {
            let appConfig = PDFViewerApplication.appConfig;
            appConfig.toolbar.zoomOut.disabled = (evt.scale === MIN_SCALE);
            appConfig.toolbar.zoomIn.disabled = (evt.scale === MAX_SCALE);

            // Update the 'scaleSelect' DOM element.
            let predefinedValueFound = selectScaleOption(evt.presetValue ||
                '' + evt.scale);
            if (!predefinedValueFound) {
                let customScaleOption = appConfig.toolbar.customScaleOption;
                let customScale = Math.round(evt.scale * 10000) / 100;
                customScaleOption.textContent =
                    mozL10n.get('page_scale_percent', {scale: customScale}, '{{scale}}%');
                customScaleOption.selected = true;
            }
            if (!PDFViewerApplication.initialized) {
                return;
            }
            PDFViewerApplication.pdfViewer.update();
        }, true);

        window.addEventListener('pagechange', function pagechange(evt) {
            let page = evt.pageNumber;
            if (evt.previousPageNumber !== page) {
                PDFViewerApplication.appConfig.toolbar.pageNumber.value = page;

                if (PDFViewerApplication.pdfSidebar.isThumbnailViewVisible) {
                    PDFViewerApplication.pdfThumbnailViewer.scrollThumbnailIntoView(page);
                }
            }
            let numPages = PDFViewerApplication.pagesCount;

            PDFViewerApplication.appConfig.toolbar.previous.disabled = (page <= 1);
            PDFViewerApplication.appConfig.toolbar.next.disabled = (page >= numPages);

            PDFViewerApplication.appConfig.toolbar.firstPage.disabled = (page <= 1);
            PDFViewerApplication.appConfig.toolbar.lastPage.disabled = (page >= numPages);

            // we need to update stats
            if (pdfjsLib.PDFJS.pdfBug && Stats.enabled) {
                let pageView = PDFViewerApplication.pdfViewer.getPageView(page - 1);
                if (pageView.stats) {
                    Stats.add(page, pageView.stats);
                }
            }
        }, true);

        let zoomDisabled = false, zoomDisabledTimeout;

        function handleMouseWheel(evt) {
            let MOUSE_WHEEL_DELTA_FACTOR = 40;
            let ticks = (evt.type === 'DOMMouseScroll') ? -evt.detail :
                evt.wheelDelta / MOUSE_WHEEL_DELTA_FACTOR;
            let direction = (ticks < 0) ? 'zoomOut' : 'zoomIn';

            let pdfViewer = PDFViewerApplication.pdfViewer;
            if (pdfViewer.isInPresentationMode) {
                evt.preventDefault();
                PDFViewerApplication.scrollPresentationMode(ticks *
                    MOUSE_WHEEL_DELTA_FACTOR);
            } else if (evt.ctrlKey || evt.metaKey) {
                let support = PDFViewerApplication.supportedMouseWheelZoomModifierKeys;
                if ((evt.ctrlKey && !support.ctrlKey) ||
                    (evt.metaKey && !support.metaKey)) {
                    return;
                }
                // Only zoom the pages, not the entire viewer.
                evt.preventDefault();
                // NOTE: this check must be placed *after* preventDefault.
                if (zoomDisabled) {
                    return;
                }

                let previousScale = pdfViewer.currentScale;

                PDFViewerApplication[direction](Math.abs(ticks));

                let currentScale = pdfViewer.currentScale;
                if (previousScale !== currentScale) {
                    // After scaling the page via zoomIn/zoomOut, the position of the upper-
                    // left corner is restored. When the mouse wheel is used, the position
                    // under the cursor should be restored instead.
                    let scaleCorrectionFactor = currentScale / previousScale - 1;
                    let rect = pdfViewer.container.getBoundingClientRect();
                    let dx = evt.clientX - rect.left;
                    let dy = evt.clientY - rect.top;
                    pdfViewer.container.scrollLeft += dx * scaleCorrectionFactor;
                    pdfViewer.container.scrollTop += dy * scaleCorrectionFactor;
                }
            } else {
                zoomDisabled = true;
                clearTimeout(zoomDisabledTimeout);
                zoomDisabledTimeout = setTimeout(function () {
                    zoomDisabled = false;
                }, 1000);
            }
        }

        window.addEventListener('DOMMouseScroll', handleMouseWheel);
        window.addEventListener('mousewheel', handleMouseWheel);

        window.addEventListener('click', function click(evt) {
            if (SecondaryToolbar.opened &&
                PDFViewerApplication.pdfViewer.containsElement(evt.target)) {
                SecondaryToolbar.close();
            }
        }, false);

        window.addEventListener('keydown', function keydown(evt) {
            if (OverlayManager.active) {
                return;
            }

            let handled = false;
            let cmd = (evt.ctrlKey ? 1 : 0) |
                (evt.altKey ? 2 : 0) |
                (evt.shiftKey ? 4 : 0) |
                (evt.metaKey ? 8 : 0);

            let pdfViewer = PDFViewerApplication.pdfViewer;
            let isViewerInPresentationMode = pdfViewer && pdfViewer.isInPresentationMode;

            // First, handle the key bindings that are independent whether an input
            // control is selected or not.
            if (cmd === 1 || cmd === 8 || cmd === 5 || cmd === 12) {
                // either CTRL or META key with optional SHIFT.
                switch (evt.keyCode) {
                    case 61: // FF/Mac '='
                    case 107: // FF '+' and '='
                    case 187: // Chrome '+'
                    case 171: // FF with German keyboard
                        if (!isViewerInPresentationMode) {
                            PDFViewerApplication.zoomIn();
                        }
                        handled = true;
                        break;
                    case 173: // FF/Mac '-'
                    case 109: // FF '-'
                    case 189: // Chrome '-'
                        if (!isViewerInPresentationMode) {
                            PDFViewerApplication.zoomOut();
                        }
                        handled = true;
                        break;
                    case 48: // '0'
                    case 96: // '0' on Numpad of Swedish keyboard
                        if (!isViewerInPresentationMode) {
                            // keeping it unhandled (to restore page zoom to 100%)
                            setTimeout(function () {
                                // ... and resetting the scale after browser adjusts its scale
                                pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
                            });
                            handled = false;
                        }
                        break;
                }
            }

            // CTRL or META without shift
            if (cmd === 1 || cmd === 8) {
                switch (evt.keyCode) {
                    case 83: // s
                        handled = true;
                        break;
                }
            }

            // CTRL+ALT or Option+Command
            if (cmd === 3 || cmd === 10) {
                switch (evt.keyCode) {
                    case 80: // p
                        PDFViewerApplication.requestPresentationMode();
                        handled = true;
                        break;
                    case 71: // g
                        // focuses input#pageNumber field
                        PDFViewerApplication.appConfig.toolbar.pageNumber.select();
                        handled = true;
                        break;
                }
            }

            if (handled) {
                evt.preventDefault();
                return;
            }

            // Some shortcuts should not get handled if a control/input element
            // is selected.
            let curElement = document.activeElement || document.querySelector(':focus');
            let curElementTagName = curElement && curElement.tagName.toUpperCase();
            if (curElementTagName === 'INPUT' ||
                curElementTagName === 'TEXTAREA' ||
                curElementTagName === 'SELECT') {
                // Make sure that the secondary toolbar is closed when Escape is pressed.
                if (evt.keyCode !== 27) { // 'Esc'
                    return;
                }
            }
            let ensureViewerFocused = false;

            if (cmd === 0) { // no control key pressed at all.
                switch (evt.keyCode) {
                    case 38: // up arrow
                    case 33: // pg up
                    case 8: // backspace
                        if (!isViewerInPresentationMode &&
                            pdfViewer.currentScaleValue !== 'page-fit') {
                            break;
                        }
                    /* in presentation mode */
                    /* falls through */
                    case 37: // left arrow
                        // horizontal scrolling using arrow keys
                        if (pdfViewer.isHorizontalScrollbarEnabled) {
                            break;
                        }
                    /* falls through */
                    case 75: // 'k'
                    case 80: // 'p'
                        PDFViewerApplication.page--;
                        handled = true;
                        break;
                    case 27: // esc key
                        if (SecondaryToolbar.opened) {
                            SecondaryToolbar.close();
                            handled = true;
                        }
                        break;
                    case 40: // down arrow
                    case 34: // pg down
                    case 32: // spacebar
                        if (!isViewerInPresentationMode &&
                            pdfViewer.currentScaleValue !== 'page-fit') {
                            break;
                        }
                    /* falls through */
                    case 39: // right arrow
                        // horizontal scrolling using arrow keys
                        if (pdfViewer.isHorizontalScrollbarEnabled) {
                            break;
                        }
                    /* falls through */
                    case 74: // 'j'
                    case 78: // 'n'
                        PDFViewerApplication.page++;
                        handled = true;
                        break;

                    case 36: // home
                        if (isViewerInPresentationMode || PDFViewerApplication.page > 1) {
                            PDFViewerApplication.page = 1;
                            handled = true;
                            ensureViewerFocused = true;
                        }
                        break;
                    case 35: // end
                        if (isViewerInPresentationMode || (PDFViewerApplication.pdfDocument &&
                            PDFViewerApplication.page < PDFViewerApplication.pagesCount)) {
                            PDFViewerApplication.page = PDFViewerApplication.pagesCount;
                            handled = true;
                            ensureViewerFocused = true;
                        }
                        break;

                    case 72: // 'h'
                        if (!isViewerInPresentationMode) {
                            PDFViewerApplication.handTool.toggle();
                        }
                        break;
                    case 82: // 'r'
                        PDFViewerApplication.rotatePages(90);
                        break;
                }
            }

            if (cmd === 4) { // shift-key
                switch (evt.keyCode) {
                    case 32: // spacebar
                        if (!isViewerInPresentationMode &&
                            pdfViewer.currentScaleValue !== 'page-fit') {
                            break;
                        }
                        PDFViewerApplication.page--;
                        handled = true;
                        break;

                    case 82: // 'r'
                        PDFViewerApplication.rotatePages(-90);
                        break;
                }
            }

            if (!handled && !isViewerInPresentationMode) {
                // 33=Page Up  34=Page Down  35=End    36=Home
                // 37=Left     38=Up         39=Right  40=Down
                // 32=Spacebar
                if ((evt.keyCode >= 33 && evt.keyCode <= 40) ||
                    (evt.keyCode === 32 && curElementTagName !== 'BUTTON')) {
                    ensureViewerFocused = true;
                }
            }

            if (cmd === 2) { // alt-key
                switch (evt.keyCode) {
                    case 37: // left arrow
                        if (isViewerInPresentationMode) {
                            PDFViewerApplication.pdfHistory.back();
                            handled = true;
                        }
                        break;
                    case 39: // right arrow
                        if (isViewerInPresentationMode) {
                            PDFViewerApplication.pdfHistory.forward();
                            handled = true;
                        }
                        break;
                }
            }

            if (ensureViewerFocused && !pdfViewer.containsElement(curElement)) {
                // The page container is not focused, but a page navigation key has been
                // pressed. Change the focus to the viewer container to make sure that
                // navigation by keyboard works as expected.
                pdfViewer.focus();
            }

            if (handled) {
                evt.preventDefault();
            }
        });

        (function animationStartedClosure() {
            // The offsetParent is not set until the pdf.js iframe or object is visible.
            // Waiting for first animation.
            PDFViewerApplication.animationStartedPromise = new Promise(
                function (resolve) {
                    window.requestAnimationFrame(resolve);
                });
        })();

        exports.PDFViewerApplication = PDFViewerApplication;

// TODO remove circular reference of pdfjs-web/secondary_toolbar on app.
        secondaryToolbarLib._setApp(exports);

    }));

}).call(pdfjsWebLibs);


function getViewerConfiguration() {
    return {
        appContainer: document.body,
        mainContainer: document.getElementById('viewerContainer'),
        viewerContainer: document.getElementById('viewer'),
        toolbar: {
            numPages: document.getElementById('numPages'),
            pageNumber: document.getElementById('pageNumber'),
            scaleSelectContainer: document.getElementById('scaleSelectContainer'),
            scaleSelect: document.getElementById('scaleSelect'),
            customScaleOption: document.getElementById('customScaleOption'),
            previous: document.getElementById('previous'),
            next: document.getElementById('next'),
            firstPage: document.getElementById('firstPage'),
            lastPage: document.getElementById('lastPage'),
            zoomIn: document.getElementById('zoomIn'),
            zoomOut: document.getElementById('zoomOut'),
            presentationModeButton: document.getElementById('presentationMode'),
        },
        secondaryToolbar: {
            toolbar: document.getElementById('secondaryToolbar'),
            toggleButton: document.getElementById('secondaryToolbarToggle'),
            presentationModeButton:
                document.getElementById('secondaryPresentationMode'),
            firstPage: document.getElementById('firstPage'),
            lastPage: document.getElementById('lastPage'),
            pageRotateCw: document.getElementById('pageRotateCw'),
            pageRotateCcw: document.getElementById('pageRotateCcw'),
            documentPropertiesButton: document.getElementById('documentProperties'),
            toggleHandTool: document.getElementById('toggleHandTool'),
        },
        fullscreen: {
            contextFirstPage: document.getElementById('contextFirstPage'),
            contextLastPage: document.getElementById('contextLastPage'),
            contextPageRotateCw: document.getElementById('contextPageRotateCw'),
            contextPageRotateCcw: document.getElementById('contextPageRotateCcw'),
        },
        sidebar: {
            // Divs (and sidebar button)
            mainContainer: document.getElementById('mainContainer'),
            outerContainer: document.getElementById('outerContainer'),
            toggleButton: document.getElementById('sidebarToggle'),
            // Buttons
            thumbnailButton: document.getElementById('viewThumbnail'),
            // Views
            thumbnailView: document.getElementById('thumbnailView'),
        },
        documentProperties: {
            overlayName: 'documentPropertiesOverlay',
            container: document.getElementById('documentPropertiesOverlay'),
            closeButton: document.getElementById('documentPropertiesClose'),
            fields: {
                'fileName': document.getElementById('fileNameField'),
                'fileSize': document.getElementById('fileSizeField'),
                'title': document.getElementById('titleField'),
                'author': document.getElementById('authorField'),
                'subject': document.getElementById('subjectField'),
                'keywords': document.getElementById('keywordsField'),
                'creationDate': document.getElementById('creationDateField'),
                'modificationDate': document.getElementById('modificationDateField'),
                'creator': document.getElementById('creatorField'),
                'producer': document.getElementById('producerField'),
                'version': document.getElementById('versionField'),
                'pageCount': document.getElementById('pageCountField')
            }
        },
        errorWrapper: {
            container: document.getElementById('errorWrapper'),
            errorMessage: document.getElementById('errorMessage'),
            closeButton: document.getElementById('errorClose'),
            errorMoreInfo: document.getElementById('errorMoreInfo'),
            moreInfoButton: document.getElementById('errorShowMore'),
            lessInfoButton: document.getElementById('errorShowLess'),
        }
    };
}

function webViewerLoad() {
    let config = getViewerConfiguration();
    window.PDFViewerApplication = pdfjsWebLibs.pdfjsWebApp.PDFViewerApplication;
    pdfjsWebLibs.pdfjsWebApp.PDFViewerApplication.run(config);
}

document.addEventListener('DOMContentLoaded', webViewerLoad, true);
