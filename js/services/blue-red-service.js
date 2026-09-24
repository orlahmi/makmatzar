/* blue-red-service.js — backward-compatibility shim.
   All data and logic has moved to ExternalPersonDataService.
   ExternalPersonDataService must be loaded before this file. */
'use strict';
if (window.ExternalPersonDataService) {
  window.BlueRedService = window.ExternalPersonDataService;
}
