'use strict';

const utils = require('../utils');

// ==========================
// exports
// ==========================

let dockCommon = {
  _dockable: true,

  /**
   * @property noCollapse
   */
  get noCollapse () {
    return this.getAttribute('no-collapse') !== null;
  },
  set noCollapse (val) {
    if (val) {
      this.setAttribute('no-collapse', '');
    } else {
      this.removeAttribute('no-collapse');
    }
  },

  _initDockable () {
    // init preferred size
    // NOTE: when preferred size is auto, it will be calculated by children,
    // otherwise it will use the size user setted.
    this._preferredWidth = 'auto';
    this._preferredHeight = 'auto';

    // init computed min size
    this._computedMinWidth = 0;
    this._computedMinHeight = 0;

    // init styles
    this.style.minWidth = 'auto';
    this.style.minHeight = 'auto';
    this.style.maxWidth = 'auto';
    this.style.maxHeight = 'auto';

    // init events
    this.addEventListener('dragover', event => {
      // NOTE: do not event.stopPropagation();
      event.preventDefault();

      utils.dragoverDock( this );
    });
  },

  _notifyResize () {
    for ( let i = 0; i < this.children.length; ++i ) {
      let childEL = this.children[i];
      if ( childEL._dockable ) {
        childEL._notifyResize();
      }
    }
  },

  _collapse () {
    if ( this.noCollapse ) {
      return false;
    }

    let parentEL = this.parentNode;

    // if we don't have any element in this panel
    if ( this.children.length === 0 ) {
      if ( parentEL._dockable ) {
        parentEL.removeDock(this);
      } else {
        parentEL.removeChild(this);
      }

      return true;
    }

    // if we only have one element in this panel
    if ( this.children.length === 1 ) {
      let childEL = this.children[0];
      childEL.style.flex = this.style.flex;
      childEL._preferredWidth = this._preferredWidth;
      childEL._preferredHeight = this._preferredHeight;

      parentEL.insertBefore( childEL, this );
      parentEL.removeChild(this);

      if ( childEL._dockable ) {
        childEL._collapse();
      }

      return true;
    }

    // if the parent dock direction is same as this panel
    if ( parentEL._dockable && parentEL.row === this.row ) {
      while ( this.children.length > 0 ) {
        parentEL.insertBefore( this.children[0], this );
      }
      parentEL.removeChild(this);

      return true;
    }

    return false;
  },

  _makeRoomForNewComer ( position, incomingEL ) {
    if ( position === 'left' || position === 'right' ) {
      let newWidth = this._preferredWidth - incomingEL._preferredWidth - utils.resizerSpace;
      if ( newWidth > 0 ) {
        this._preferredWidth = newWidth;
      } else {
        newWidth = Math.floor((this._preferredWidth - utils.resizerSpace) * 0.5);
        this._preferredWidth = newWidth;
        incomingEL._preferredWidth = newWidth;
      }
    } else {
      let newHeight = this._preferredHeight - incomingEL._preferredHeight - utils.resizerSpace;
      if ( newHeight > 0 ) {
        this._preferredHeight = newHeight;
      } else {
        newHeight = Math.floor((this._preferredHeight - utils.resizerSpace) * 0.5);
        this._preferredHeight = newHeight;
        incomingEL._preferredHeight = newHeight;
      }
    }
  },

  // position: left, right, top, bottom
  addDock ( position, incomingEL, hasSameParentBefore ) {
    if ( incomingEL._dockable === false ) {
      console.warn(`Dock element at position ${position} must be dockable`);
      return;
    }

    let needNewDock = false;
    let parentEL = this.parentNode;
    let newDock, newResizer, nextEL;

    if ( parentEL._dockable ) {
      // check if need to create new Dock element
      if ( position === 'left' || position === 'right' ) {
        if ( !parentEL.row ) {
          needNewDock = true;
        }
      } else {
        if ( parentEL.row ) {
          needNewDock = true;
        }
      }

      // process dock
      if ( needNewDock ) {
        // new <ui-dock>
        newDock = document.createElement('ui-dock');

        if ( position === 'left' || position === 'right' ) {
          newDock.row = true;
        } else {
          newDock.row = false;
        }

        //
        parentEL.insertBefore(newDock, this);

        //
        if ( position === 'left' || position === 'top' ) {
          newDock.appendChild(incomingEL);
          newDock.appendChild(this);
        } else {
          newDock.appendChild(this);
          newDock.appendChild(incomingEL);
        }

        // finalize
        newDock._initResizers();
        newDock._finalizePreferredSize();

        newDock.style.flex = this.style.flex;
        newDock._preferredWidth = this._preferredWidth;
        newDock._preferredHeight = this._preferredHeight;

        // NOTE:
        // if the incoming element has the same parent before and the docking direction doesn't change afterward,
        // do not re-destribute the space

        // re-destribute the space for thisEL and incomingEL
        this._makeRoomForNewComer ( position, incomingEL );

      } else {
        // new resizer
        newResizer = null;
        newResizer = document.createElement('ui-dock-resizer');
        newResizer.vertical = parentEL.row;

        //
        if ( position === 'left' || position === 'top' ) {
          parentEL.insertBefore(incomingEL, this);
          parentEL.insertBefore(newResizer, this);
        } else {
          // insert after
          nextEL = this.nextElementSibling;
          if ( nextEL === null ) {
            parentEL.appendChild(newResizer);
            parentEL.appendChild(incomingEL);
          } else {
            parentEL.insertBefore(newResizer, nextEL);
            parentEL.insertBefore(incomingEL, nextEL);
          }
        }

        // NOTE:
        // if the incoming element has the same parent before and the docking direction doesn't change afterward,
        // do not re-destribute the space

        // re-destribute the space for thisEL and incomingEL
        if ( !hasSameParentBefore ) {
          this._makeRoomForNewComer ( position, incomingEL );
        }
      }
    }
    // if this is root panel
    else {
      if ( position === 'left' || position === 'right' ) {
        if ( !this.row ) {
          needNewDock = true;
        }
      } else {
        if ( this.row ) {
          needNewDock = true;
        }
      }

      // process dock
      if ( needNewDock ) {
        // new <ui-dock>
        newDock = document.createElement('ui-dock');
        newDock.row = this.row;

        if ( position === 'left' || position === 'right' ) {
          this.row = true;
        } else {
          this.row = false;
        }

        while ( this.children.length > 0 ) {
          let childEL = this.children[0];
          newDock.appendChild(childEL);
        }

        //
        if ( position === 'left' || position === 'top' ) {
          this.appendChild(incomingEL);
          this.appendChild(newDock);
        } else {
          this.appendChild(newDock);
          this.appendChild(incomingEL);
        }

        //
        this._initResizers();

        // finalize
        newDock._finalizePreferredSize();
        newDock.style.flex = this.style.flex;
        newDock._preferredWidth = this._preferredWidth;
        newDock._preferredHeight = this._preferredHeight;

        // NOTE:
        // if the incoming element has the same parent before and the docking direction doesn't change afterward,
        // do not re-destribute the space

        // re-destribute the space for thisEL and incomingEL
        this._makeRoomForNewComer ( position, incomingEL );
      } else {
        // new resizer
        newResizer = null;
        newResizer = document.createElement('ui-dock-resizer');
        newResizer.vertical = this.row;

        //
        if ( position === 'left' || position === 'top' ) {
          this.insertBefore(incomingEL, this.firstElementChild);
          this.insertBefore(newResizer, this.firstElementChild);
        } else {
          // insert after
          nextEL = this.nextElementSibling;
          if ( nextEL === null ) {
            this.appendChild(newResizer);
            this.appendChild(incomingEL);
          } else {
            this.insertBefore(newResizer, nextEL);
            this.insertBefore(incomingEL, nextEL);
          }
        }

        // NOTE:
        // if the incoming element has the same parent before and the docking direction doesn't change afterward,
        // do not re-destribute the space

        // re-destribute the space for thisEL and incomingEL
        if ( !hasSameParentBefore ) {
          this._makeRoomForNewComer ( position, incomingEL );
        }
      }
    }
  },

  removeDock ( childEL ) {
    let contains = false;

    for ( let i = 0; i < this.children.length; ++i ) {
      if ( this.children[i] === childEL ) {
        contains = true;
        break;
      }
    }

    if ( !contains ) {
      return false;
    }

    if ( this.children[0] === childEL ) {
      if ( childEL.nextElementSibling && utils.isDockResizer(childEL.nextElementSibling) ) {
        this.removeChild(childEL.nextElementSibling);
      }
    } else {
      if ( childEL.previousElementSibling && utils.isDockResizer(childEL.previousElementSibling) ) {
        this.removeChild(childEL.previousElementSibling);
      }
    }

    this.removeChild(childEL);

    // return if dock can be collapsed
    return this._collapse();
  },
};

module.exports = dockCommon;