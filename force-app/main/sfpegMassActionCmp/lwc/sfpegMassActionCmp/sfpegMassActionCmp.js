/***
* @author P-E GROS
* @date   July 2022
* @description  LWC Component for CRM Analytics to execute mass actions out of a query directly within
*               the Dashboard.
*
* Legal Notice
* 
* MIT License
* 
* Copyright (c) 2022 pegros
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
***/

import { LightningElement, wire , api, track } from 'lwc';
import { getRecord }    from 'lightning/uiRecordApi';
import getConfiguration from '@salesforce/apex/sfpegMassAction_CTL.getConfiguration';
import filterRows       from '@salesforce/apex/sfpegMassAction_CTL.filterRows';
import executeAction    from '@salesforce/apex/sfpegMassAction_CTL.executeAction';
import currentUserId    from '@salesforce/user/Id';
import { notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';


import SORT_TITLE       from '@salesforce/label/c.sfpegMassActionSortTitle';
import INIT_TITLE       from '@salesforce/label/c.sfpegMassActionInitTitle';
import PROCESS_TITLE    from '@salesforce/label/c.sfpegMassActionProcessTitle';

import UNDO_LABEL       from '@salesforce/label/c.sfpegMassActionUndoLabel';
import CONFIRM_LABEL    from '@salesforce/label/c.sfpegMassActionConfirmLabel';
import CANCEL_LABEL     from '@salesforce/label/c.sfpegMassActionCancelLabel';
import CLOSE_LABEL      from '@salesforce/label/c.sfpegMassActionCloseLabel';

import STEP_1_LABEL     from '@salesforce/label/c.sfpegMassActionStep1Label';
import STEP_1_MSG       from '@salesforce/label/c.sfpegMassActionStep1Message';
import STEP_2_LABEL     from '@salesforce/label/c.sfpegMassActionStep2Label';
import STEP_2_NO_FORM_MSG   from '@salesforce/label/c.sfpegMassActionStep2NoFormMessage';
import STEP_2_FORM_MSG      from '@salesforce/label/c.sfpegMassActionStep2FormMessage';
import STEP_3_LABEL     from '@salesforce/label/c.sfpegMassActionStep3Label';
import STEP_3_MSG       from '@salesforce/label/c.sfpegMassActionStep3Message';
import STEP_4_LABEL     from '@salesforce/label/c.sfpegMassActionStep4Label';
import STEP_4_MSG       from '@salesforce/label/c.sfpegMassActionStep4Message';
import STEP_4_DETAILS   from '@salesforce/label/c.sfpegMassActionStep4Details';

import FILTER_STATUS    from '@salesforce/label/c.sfpegMassActionStatusExcluded';
import FILTER_ICON      from '@salesforce/label/c.sfpegMassActionIconExcluded';

import INIT_ERROR       from '@salesforce/label/c.sfpegMassActionInitError';
import PROCESS_ERROR    from '@salesforce/label/c.sfpegMassActionProcessError';
import CONFIG_ERROR     from '@salesforce/label/c.sfpegMassActionConfigError';
import FILTER_ALL_ERROR from '@salesforce/label/c.sfpegMassActionFilterAllError';
import NO_SELECT_ERROR  from '@salesforce/label/c.sfpegMassActionNoSelectionError';
import REQUIRED_FIELDS_ERROR  from '@salesforce/label/c.sfpegMassActionRequiredFieldsError';


var MASS_ACTION_CONFIGS = {};

export default class SfpegMassActionCmp extends LightningElement {

    //----------------------------------------------------------------
    // Configuration Parameters
    //----------------------------------------------------------------  
    @api title;             // Component title
    @api titleSize;         // Component title text size (in px)
    @api keyField;          // Dimension field uniquely identifying each line (OBSOLETE)

    @api configName;        // Developer Name of the actions custom metadata record to be used.

    @api isDebug;           // Flag to activate debug information

    //----------------------------------------------------------------
    // Context Data
    //----------------------------------------------------------------  
    @api metadata;          // Metadata provided by the enclosing CRM Analytics Dashboard
    // Query Results provided by the enclosing CRM Analytics Dashboard
    @api
    get results() {
        return this._results;
    }
    set results(value) {
        if (this.isDebug) console.log('setResults: START with ', JSON.stringify(value));
        this._results = value;
        this.tableData = [... this._results];
        //this.tableData = JSON.parse(JSON.stringify(this._results));
        this.selection = [];
        this.sortedBy = null;
        this.sortDirection = 'asc';
        if (this.isDebug) console.log('setResults: END');
    }

    userId = currentUserId;
    userFields = null;
    userData = null;

    @api    objectApiName;      // Object API Name for current page record (if any)
    @api    recordId;           // ID of current page record (if any)
    recordFields = null;        // List of Field API Names for current page record (if any) required as Query Input
    recordData;                 // Record Data fetched via LDS

    //----------------------------------------------------------------
    // Internal Technical Properties
    //----------------------------------------------------------------  

    // Table Display
    isReady = false;            // Component readiness status controlling spinner

    // Table Display
    _results;                   // Query Results provided by the enclosing CRM Analytics Dashboard
    tableHeight = 0;            // Table height in px
    tableColumns = [];          // lightning-dataTable configuration
    tableData = [];             // Data displayed in the datatable (cloned from results)

    // Table Sorting
    @track sortFields = null;       // List of field sort options for List display mode (for the sort menu)
    @track sortDirection = 'asc';   // Current sorting direction (asc/desc)
    @track sortedBy = null;         // Field upon which the current sorting is done

    // Table Filtering
    @track isFiltered = false;      // State of the filter applied 
    @track showFilter = false;      // State of the filter popup
    @track filterFields = null;     // List of field filter scope options
    @track filterScope = null;      // Applicable filter scope selected (default being "ALL")
    @track filterString = null;     // Applicable filter keywords entered
    @track isFiltering = false;     // Ongoing Filter state  (to control spinner)

    // Row selection
    @track selection = [];          // List of selected rows

    // Datatable Rendering optimisation (since Summer22)
    renderConfig = {virtualize: 'vertical'};

    // Global Configuration
    @track configDetails;           // Action configuration retrieved / parsed from metadata
    @track initMessage;             // Error message triggered upon component initialisation/refresh
    @track context;                 // Component context

    // Header Actions Management
    @track headerAction = {};           // Details about the triggered header action
    @track headerActionMessageTitle;    // Message triggered upon header action execution
    @track headerActionMessageDetail;   // Detailed message triggered upon header action execution
    @track headerActionMessageSeverity; // Header Action message severity (info, warning, error)

    // Main Action Management
    @track actionStep = "1";        // Current Action execution step
    @track actionProgress = 0;      // Action execution progress (in ratio)
    @track actionRows;              // Action rows to process
    @track actionMessageTitle;      // Message triggered upon action execution
    @track actionMessageDetail;     // Detailed message triggered upon action execution
    @track actionMessageSeverity;   // Action Message severity (info, warning, error)
    @track actionCountOK;           // Number of records processed OK at last execution
    @track actionCountKO;           // Number of records processed KO at last execution

    // Custom Labels
    sortTitle       = SORT_TITLE;
    initTitle       = INIT_TITLE;
    processTitle    = PROCESS_TITLE;
    undoLabel       = UNDO_LABEL;
    confirmLabel    = CONFIRM_LABEL;
    cancelLabel     = CANCEL_LABEL;
    closeLabel      = CLOSE_LABEL;
    step1Label      = STEP_1_LABEL;
    step2Label      = STEP_2_LABEL;
    step3Label      = STEP_3_LABEL;
    step4Label      = STEP_4_LABEL;
    initError       = INIT_ERROR;

    //----------------------------------------------------------------
    // Custom Getters
    //----------------------------------------------------------------   
    // Component Header
    get cmpTitle() {
        return this.title + ' (' + (this.selection?.length || 0) + ' / ' + (this.tableData?.length || 0) + ')';
    }
    get titleStyle() {
        return "font-size:" + this.titleSize + 'px;'
    }
    get actionLabel() {
        return 'ACTION';
    }

    // Action Header
    get actionLabel() {
        return 'ACTION';
    }

    // Data Table
    get tableStyle() {
        return ((this.tableHeight && (this.results?.length > 0)) ? "height:" + this.tableHeight + "px !important;": '');
    }
    get hideCheckbox() {
        return false;
        //return (this.configDetails.display.hideCheckboxColumn == null) || this.configDetails.display.hideCheckboxColumn;
    }
    get widthMode() {
        return 'auto';
        //return this.configDetails.display.columnWidthMode || 'fixed';
    }
    get maxRowSelection() {
        //return this.configDetails.display.maxRowSelection || 1;
        return 200;
    }

    // Header Actions
    get hasHeaderActionErrorWarning() {
        return (this.headerActionMessageTitle) && ((this.headerActionMessageSeverity == 'error') || (this.headerActionMessageSeverity == 'warning'));
    }

    // Main Action
    get actionStyle() {
        return ((this.tableHeight && (this.results?.length > 0)) ? "height:" + (this.tableHeight - 125) + "px !important;" : "");
        /*        "max-height:" + (this.tableHeight - 95) + "px !important; min-height:"
                                + Math.round(this.tableHeight/2) +"px !important;": '');*/
    }
    get isStep2() {
        return (this.actionStep == 2);
    }
    get isProcessing() {
        return (this.actionStep == 3) && (this.actionMessageSeverity != 'error');
    }
    get isProgressStep() {
        return ((this.actionStep == 1) || (this.actionStep == 3));
    }
    get showCancel(){
        return (this.actionStep == 2) && (this.actionMessageSeverity != 'error');
    }
    get showClose(){
        return (this.actionMessageSeverity == 'error') || (this.actionStep == 4);
    }
    get showConfirm(){
        return (this.actionStep == 2) && (this.actionMessageSeverity != 'error');
    }
    get hasActionError() {
        return (this.actionMessageTitle) && (this.actionMessageSeverity == 'error');
    }
    get hasActionErrorWarning() {
        return (this.actionMessageTitle) && ((this.actionMessageSeverity == 'error') || (this.actionMessageSeverity == 'warning'));
    }
    get actionProgressMessage() {
        switch (this.actionStep){
            case "1": return STEP_1_MSG;
            case "2" : return (this.configDetails.action.form ? STEP_2_FORM_MSG : STEP_2_NO_FORM_MSG).replace('{0}',this.selection.length).replace('{1}',this.actionRows.length);
            case "3" : return STEP_3_MSG;
            default : return '';
        } 

    }
    get actionProgressTitle() {
        return this.actionProgress + '%';
    }



    //----------------------------------------------------------------
    // Component initialisation  
    //----------------------------------------------------------------      
    connectedCallback() {
        if (this.isDebug) console.log('connected: START with title ', this.title);
        if (this.isDebug) console.log('connected: with configName ', this.configName);        

        if (!this.configName) {
            console.error('connected: Missing MassAction configuration name');
            this.initMessage = 'Missing Configuration Name !';
            this.isReady = true;
            return;
        }

        if (this.isDebug) console.log('connected: userId provided ', this.userId);
        if (this.isDebug) console.log('connected: recordId provided ', this.recordId);
        if (this.isDebug) console.log('connected: objectApiName provided ', this.objectApiName);

        if (this.isDebug) console.log('connected: config name fetched ', this.configName);
        if (MASS_ACTION_CONFIGS[this.configName]) {
            this.configDetails = MASS_ACTION_CONFIGS[this.configName];
            if (this.isDebug) console.log('connected: configuration already available ',JSON.stringify(this.configDetails));

            this.initContext();
            if (this.isDebug) console.log('connected: context initialized');

            this.isReady = true;
            if (this.isDebug) console.log('connected: END');
        }
        else {
            if (this.isDebug) console.log('connected: fetching configuration from server');
            getConfiguration({actionName: this.configName})
            .then( result => {
                if (this.isDebug) console.log('connected: configuration received  ',result);
                try {
                    let displayConfig = JSON.parse(result?.DisplayConfig__c || '');
                    MASS_ACTION_CONFIGS[this.configName] = {
                        label: result?.MasterLabel,
                        display: {
                            header : this.initConfig(result?.DisplayActions__c),
                            options : {
                                columnWidthMode: (displayConfig?.columnWidthMode || 'auto'),
                                hideCheckboxColumn: (displayConfig?.hideCheckboxColumn == null || displayConfig?.hideCheckboxColumn),
                                maxRowSelection: (displayConfig?.maxRowSelection || 200)
                            },
                            columns : (displayConfig?.columns || this.getDefaultDisplayConfig())
                        },
                        context: this.initConfig(result?.DisplayContext__c),
                        filter : {
                            isActive : result?.FilterToDo__c,
                            batchSize : result?.FilterBatchSize__c || 0,
                            template : this.initConfig(result?.FilterTemplate__c)
                        },
                        action : {
                            label: result?.ActionLabel__c || 'Execute',
                            title: result?.ActionTitle__c || 'Processing Action',
                            message: result?.ActionMessage__c,
                            template: this.initConfig(result?.ActionTemplate__c),
                            form:  this.initConfig(result?.ActionForm__c),
                            batchSize: result?.ActionBatchSize__c || 0
                        }
                    };
                    this.configDetails = MASS_ACTION_CONFIGS[this.configName];
                    if (this.isDebug) console.log('connected: configuration parsed ', JSON.stringify(this.configDetails));

                    this.initContext();
                    if (this.isDebug) console.log('connected: context initialized');

                    this.isReady = true;
                    if (this.isDebug) console.log('connected: END');
                }
                catch (parseError){
                    console.warn('connected: END KO / configuration parsing failed ', parseError);
                    this.initMessage = 'Configuration parsing failed!';
                    this.isReady = true;
                }
            })
            .catch( error => {
                console.warn('connected: END KO / configuration fetch error ',error);
                this.initMessage = error.body?.message || JSON.stringify(error);
                this.isReady = true;
            });
            if (this.isDebug) console.log('connected: configuration fetch request sent');
        }
    }

    // Setting Table height to adjust to CRM Analytics component size.
    renderedCallback() {
        if (this.isDebug) console.log('rendered: START with title ', this.title);

        if (this.tableHeight == 0) {
            if (this.isDebug) console.log('rendered: initializing table height');

            let rootContainer = this.template.querySelector('.rootContainer');
            if (this.isDebug) console.log('rendered: rootContainer ',rootContainer);
            let headerContainer = this.template.querySelector('.headerContainer');
            if (this.isDebug) console.log('rendered: headerContainer ',headerContainer);

            this.tableHeight = rootContainer.clientHeight - headerContainer.offsetHeight - 8;
            if (this.isDebug) console.log('rendered: rootContainer height ', rootContainer.clientHeight);
            if (this.isDebug) console.log('rendered: headerContainer height ', headerContainer.offsetHeight);
            if (this.isDebug) console.log('rendered: tableHeight init ', this.tableHeight);
        }
        else {
            if (this.isDebug) console.log('rendered: tableHeight already set ', this.tableHeight);
        }

        if (this.isDebug) console.log('rendered: END');
    }

    // Current User 
    @wire(getRecord, { "recordId": '$userId', "fields": '$userFields' })
    wiredUser({ error, data }) {
        if (this.isDebug) console.log('wiredUser: userId ', this.userId);
        if (this.isDebug) console.log('wiredUser: userFields ',JSON.stringify(this.userFields));

        if (data) {
            this.userData = data;
            if (this.isDebug) console.log('wiredUser: userData fetched ',JSON.stringify(this.userData));

            if (this.configDetails?.context) {
                if (this.isDebug) console.log('wiredUser: updating context');

                for (let iterField in this.configDetails.context) {
                    if (this.isDebug) console.log('wiredUser: processing context field ',iterField);
                    let iterSource = this.configDetails.context[iterField];
                    if (this.isDebug) console.log('wiredUser: with source ',iterSource);

                    if (iterSource.userField) {
                        if (this.isDebug) console.log('wiredUser: fetching User field value ',iterSource.userField);
                        this.context[iterField] = data.fields[iterSource.userField].value;
                    }
                    /*if (iterSource.fieldName?.startsWith('User.')) {
                        if (this.isDebug) console.log('wiredUser: fetching User field value ',iterSource.fieldName);
                        let fieldPath = iterSource.fieldName.split('.');
                        fieldPath.shift();
                        this.context[iterField] = data.fields[fieldPath.shift()].value;
                    }*/
                    else {
                        if (this.isDebug) console.log('wiredUser: ignoring context field');
                    }
                }
                if (this.isDebug) console.log('wiredUser: context updated ',JSON.stringify(this.context));
            }
        }
        else if (error) {
            console.warn('wiredUser: user data fetch error ',JSON.stringify(error));
        }
        else {
            if (this.isDebug) console.log('wiredUser: no userData ');
        }

        if (this.isDebug) console.log('wiredUser: END');
    }

    // Current Record 
    @wire(getRecord, { "recordId": '$recordId', "fields": '$recordFields' })
    wiredRecord({ error, data }) {
        if (this.isDebug) console.log('wiredRecord: START');
        if (this.isDebug) console.log('wiredRecord: with recordId ', this.recordId);
        if (this.isDebug) console.log('wiredRecord: with recordFields ',JSON.stringify(this.recordFields));

        if (data) {
            this.recordData = data;
            if (this.isDebug) console.log('wiredRecord: recordData fetched ',JSON.stringify(this.recordData));

            if (this.configDetails?.context) {
                if (this.isDebug) console.log('wiredRecord: updating context');

                for (let iterField in this.configDetails.context) {
                    if (this.isDebug) console.log('wiredRecord: processing context field ',iterField);
                    let iterSource = this.configDetails.context[iterField];
                    if (this.isDebug) console.log('wiredRecord: with source ',iterSource);

                    if (iterSource.recordField) {
                        if (this.isDebug) console.log('wiredRecord: fetching Record field value ',iterSource.recordField);
                        this.context[iterField] = data.fields[iterSource.recordField].value;
                    }
                    /*if (iterSource.fieldName?.startsWith(this.objectApiName || "NONE")) {
                        if (this.isDebug) console.log('wiredRecord: fetching Record field value ',iterSource.fieldName);
                        let fieldPath = iterSource.fieldName.split('.');
                        fieldPath.shift();
                        this.context[iterField] = data.fields[fieldPath.shift()].value;
                    }*/
                    else {
                        if (this.isDebug) console.log('wiredRecord: ignoring context field');
                    }
                }
                if (this.isDebug) console.log('wiredUser: context updated ',JSON.stringify(this.context));
            }
        }
        else if (error) {
            console.warn('wiredRecord: record data fetch error ',JSON.stringify(error));
        }
        else {
            if (this.isDebug) console.log('wiredRecord: no recordData ');
        }
        if (this.isDebug) console.log('wiredRecord: END');
    }


    //----------------------------------------------------------------
    // Event Handlers
    //----------------------------------------------------------------    

    // Table Action Events
    handleReset(event){
        if (this.isDebug) console.log('handleReset: START for title ',this.title);
        this.tableData = [... this._results];
        //this.tableData = JSON.parse(JSON.stringify(this._results));
        this.selection = [];

        let dataTable = this.template.querySelector('lightning-datatable');
        if (this.isDebug) console.log('handleReset: refreshing data in dataTable ',dataTable);
        dataTable.data = this.tableData;
        dataTable.selectedRows = [];

        if (this.isDebug) console.log('handleReset: END');
    }

    handleSort(event){
        if (this.isDebug) console.log('handleSort: START with ',JSON.stringify(event.detail));

        let sortingSpînner = this.template.querySelector('.sortingSpînner');
        if (this.isDebug) console.log('handleSort: showing sortingSpînner',sortingSpînner);
        sortingSpînner.classList.remove("slds-hide");

        // workaround to enforce display of spinner
        setTimeout(() => {
            let { fieldName: sortedBy, sortDirection } = event.detail;
            if (this.isDebug) console.log('handleSort: selected sortedBy ',sortedBy);
            if (this.isDebug) console.log('handleSort: selected sortDirection ',sortDirection);

            let results2sort = [...this.tableData];
            if (this.isDebug) console.log('handleSort: results2sort init ',results2sort);
            results2sort.sort(this.sortBy(sortedBy, sortDirection !== 'asc'));
            if (this.isDebug) console.log('handleSort: results2sort sorted ',results2sort);
            this.tableData = [];

            setTimeout(() => {
                this.tableData = results2sort;
                if (this.isDebug) console.log('handleSort: tableData updated' );

                this.sortDirection = sortDirection;
                if (this.isDebug) console.log('handleSort: sortDirection updated ',this.sortDirection );
                this.sortedBy = sortedBy;
                if (this.isDebug) console.log('handleSort: sortedBy updated ',this.sortedBy);

                if (this.isDebug) console.log('handleSort: hiding sortingSpînner',sortingSpînner);
                sortingSpînner.classList.add("slds-hide");
                if (this.isDebug) console.log('handleSort: END');
            },100);

        },100);

        if (this.isDebug) console.log('handleSort: launching sort');
    }

    handleSelect(event){
        if (this.isDebug) console.log('handleSelect: START for title ',this.title);
        if (this.isDebug) console.log('handleSelect: event details',JSON.stringify(event.detail));
        if (this.isDebug) console.log('handleSelect: event detail selection ',JSON.stringify(event.detail.selectedRows));

        if (this.isDebug) console.log('handleSelect: prior selection ',JSON.stringify(this.selection));
        this.selection = event.detail.selectedRows || [];
        if (this.isDebug) console.log('handleSelect: selection updated ',JSON.stringify(this.selection));

        if (this.isDebug) console.log('handleSelect: END');
    }

    // Header Action Events
    handleHeaderFormLoad(event){
        if (this.isDebug) console.log('handleHeaderFormLoad: START for title  ',this.title);

        if (this.headerAction.form.values) {
            if (this.isDebug) console.log('handleHeaderFormLoad: initialising default values ', this.headerAction.form.values);
            if (this.isDebug) console.log('handleHeaderFormLoad: current context fetched ', this.context);

            for (let iterField in this.headerAction.form.values) {
                if (this.isDebug) console.log('handleHeaderFormLoad: processing field ', iterField);
                let iterSource = this.headerAction.form.values[iterField];
                if (this.isDebug) console.log('handleHeaderFormLoad: mapped to ', iterSource);

                let iterValue = this.context[iterSource];
                if (this.isDebug) console.log('handleHeaderFormLoad: with value ', iterValue);

                let inputField = this.template.querySelector("lightning-input-field[data-name='" + iterField + "']");
                if (this.isDebug) console.log('initRowTemplate: updating inputField ', inputField);

                if (inputField) inputField.value = iterValue;
            }
            if (this.isDebug) console.log('handleHeaderFormLoad: all default values initialised');
        }
        else {
            if (this.isDebug) console.log('handleHeaderFormLoad: no default value to initialise');
        }

        let formSpinner = this.template.querySelector('.formSpinner');
        if (this.isDebug) console.log('handleHeaderFormLoad: hiding formSpinner');
        formSpinner?.classList?.add("slds-hide");

        if (this.isDebug) console.log('handleHeaderFormLoad: END');
    }

    handleHeaderAction(event) {
        if (this.isDebug) console.log('handleHeaderAction: START for title ',this.title);
        if (this.isDebug) console.log('handleHeaderAction: event ',event);

        this.headerActionMessageTitle = null;
        this.headerActionMessageDetail = null;
        this.headerActionMessageSeverity = null;

        this.headerAction = event.target.value;
        if (this.isDebug) console.log('handleHeaderAction: selected header action ',JSON.stringify(this.headerAction));

        if ((this.selection?.length || 0) == 0) {
            console.warn('handleHeaderAction: no record selected');
            this.headerActionMessageTitle = PROCESS_ERROR;
            this.headerActionMessageDetail = NO_SELECT_ERROR;
            this.headerActionMessageSeverity = 'error';
        }

        let tableContainer = this.template.querySelector('.tableContainer');
        if (this.isDebug) console.log('handleHeaderAction: hiding tableContainer');
        tableContainer.classList.add("slds-hide");

        let headerActionContainer = this.template.querySelector('.headerActionContainer');
        if (this.isDebug) console.log('handleHeaderAction: showing headerContainer',headerActionContainer);
        headerActionContainer.classList.remove("slds-hide");

        let headerButtons = this.template.querySelectorAll('.headerButton');
        if (this.isDebug) console.log('handleHeaderAction: deactivating headerButtons');
        headerButtons.forEach(item => {item.disabled = true;});

        if (this.isDebug) console.log('handleHeaderAction: END');
    }

    handleHeaderCancel(event) {
        if (this.isDebug) console.log('handleHeaderCancel: START for title  ',this.title);

        this.headerAction = {};
        this.headerActionMessageTitle = null;
        this.headerActionMessageDetail = null;
        this.headerActionMessageSeverity = null;

        let dataTable = this.template.querySelector('lightning-datatable');
        if (this.isDebug) console.log('handleHeaderCancel: unselecting rows in dataTable ',dataTable);
        dataTable.selectedRows = [];
        this.selection = [];

        let headerActionContainer = this.template.querySelector('.headerActionContainer');
        if (this.isDebug) console.log('handleHeaderCancel: hiding headerContainer',headerActionContainer);
        headerActionContainer.classList.add("slds-hide");

        let tableContainer = this.template.querySelector('.tableContainer');
        if (this.isDebug) console.log('handleHeaderCancel: showing tableContainer');
        tableContainer.classList.remove("slds-hide");

        let headerButtons = this.template.querySelectorAll('.headerButton');
        if (this.isDebug) console.log('handleHeaderCancel: reactivating headerButtons');
        headerButtons.forEach(item => {item.disabled = false;});

        if (this.isDebug) console.log('handleHeaderCancel: END');
    }

    handleHeaderConfirm(event) {
        if (this.isDebug) console.log('handleHeaderConfirm: START for title ',this.title);

        switch(this.headerAction?.type) {
            case 'reset' :
                if (this.isDebug) console.log('handleHeaderConfirm: resetting selection');
                if (this.resetSelection()) this.handleHeaderCancel();
                break;
            case 'update' :
                if (this.isDebug) console.log('handleHeaderConfirm: updating selection');
                if (this.updateSelection()) this.handleHeaderCancel();
                break;
            default :
                console.warn('handleHeaderConfirm: END KO / unsupported action type');
                this.headerActionMessageTitle = CONFIG_ERROR;
                this.headerActionMessageDetail = 'Unknown header action type: ' + this.headerAction?.type;
                this.headerActionMessageSeverity = 'error';
                return;
        }

        if (this.isDebug) console.log('handleHeaderConfirm: END');
        //this.handleHeaderCancel();
    }

    resetSelection() {
        if (this.isDebug) console.log('resetSelection: START');

        this.selection.forEach(item => {
            if (this.isDebug) console.log('resetSelection: processing selected row ',item);
            let originalItem = this._results.find(itemResult => itemResult[this.keyField] == item[this.keyField]);
            if (this.isDebug) console.log('resetSelection: original row fetched ',originalItem);
            let itemIndex = this.tableData.findIndex(itemData => itemData[this.keyField] == item[this.keyField]);
            if (this.isDebug) console.log('resetSelection: displayed row index fetched ',itemIndex);
            let newItem = {...originalItem};
            if (this.isDebug) console.log('resetSelection: new item reset ',newItem);
            this.tableData.splice(itemIndex,1,newItem);
        });
        if (this.isDebug) console.log('resetSelection: selection reset in data ', JSON.stringify(this.tableData));

        let dataTable = this.template.querySelector('lightning-datatable');
        if (this.isDebug) console.log('resetSelection: refreshing data in dataTable ',dataTable);
        dataTable.data = this.tableData;
        if (this.isDebug) console.log('resetSelection: END');
        return true;
    }

    updateSelection() {
        if (this.isDebug) console.log('updateSelection: START');

        if (this.headerAction?.form) {
            if (this.isDebug) console.log('updateSelection: checking input form');
            if (!this.checkMissingFields('headerField')) {
                console.warn('updateSelection: END KO / some required fields are missing');
                this.headerActionMessageTitle = PROCESS_ERROR;
                this.headerActionMessageDetail = REQUIRED_FIELDS_ERROR;
                this.headerActionMessageSeverity = 'warning';
                return false
            }
            else {
                if (this.isDebug) console.log('updateSelection: input form checked OK');
            }
        }
        else {
            if (this.isDebug) console.log('updateSelection: no input form to check');
        }

        let rowTemplate = this.prepareUpdateTemplate();
        if (this.isDebug) console.log('updateSelection: rowTemplate prepared ', rowTemplate);

        this.selection.forEach(item => {
            if (this.isDebug) console.log('updateSelection: processing selected row ', item);
            let itemIndex = this.tableData.findIndex(itemData => itemData[this.keyField] == item[this.keyField]);
            if (this.isDebug) console.log('updateSelection: displayed row index fetched ',itemIndex);
            let newItem = {...item, ...rowTemplate};
            if (this.isDebug) console.log('updateSelection: new item updated ',newItem);
            this.tableData.splice(itemIndex,1,newItem);
        });
        if (this.isDebug) console.log('updateSelection: selection updated in data ', JSON.stringify(this.tableData));

        let dataTable = this.template.querySelector('lightning-datatable');
        if (this.isDebug) console.log('updateSelection: refreshing data in dataTable ',dataTable);
        dataTable.data = this.tableData;

        if (this.isDebug) console.log('updateSelection: END');
        return true;
    }

    prepareUpdateTemplate() {
        if (this.isDebug) console.log('prepareUpdateTemplate: START');

        let rowTemplate = {... (this.headerAction.template?.base || {})};
        if (this.isDebug) console.log('prepareUpdateTemplate: base template init', rowTemplate);
        
        rowTemplate._status = this.headerAction.status || 'updated';
        //rowTemplate._icon = 'utility:replace'; 
        //rowTemplate._icon = 'utility:record_update';
        rowTemplate._icon = this.headerAction.icon || 'custom:custom83';

        //rowTemplate._color = 'slds-icon-text-error';
        rowTemplate._color = this.headerAction.color || 'slds-text-color_error';

        if (this.headerAction.template?.form) {
            if (this.isDebug) console.log('prepareUpdateTemplate: initialising template from form');
            for (let iterField in this.headerAction.template.form) {
                if (this.isDebug) console.log('prepareUpdateTemplate: processing field ', iterField);
                let iterSource = this.headerAction.template.form[iterField];
                if (this.isDebug) console.log('prepareUpdateTemplate: mapped to ', iterSource);
    
                let inputField = this.template.querySelector("lightning-input-field[data-name='" + iterSource + "']");
                if (this.isDebug) console.log('prepareUpdateTemplate: inputField fetched ', inputField);

                let iterValue = inputField.value;
                if (this.isDebug) console.log('prepareUpdateTemplate: value extracted ', iterValue);
                rowTemplate[iterField] = iterValue;
            }
            if (this.isDebug) console.log('prepareUpdateTemplate: template updated from form', rowTemplate);
        }
        else {
            if (this.isDebug) console.log('prepareUpdateTemplate: no form data required for template');
        }

        if (this.isDebug) console.log('prepareUpdateTemplate: END');
        return rowTemplate;
    }

    // Main Action Events
    handleMainFormLoad(event){
        if (this.isDebug) console.log('handleMainFormLoad: START for title  ',this.title);

        if (this.configDetails.action.form.values) {
            if (this.isDebug) console.log('handleMainFormLoad: initialising default values ', this.configDetails.action.form.values);
            if (this.isDebug) console.log('handleMainFormLoad: current context fetched ', this.context);

            for (let iterField in this.configDetails.action.form.values) {
                if (this.isDebug) console.log('handleMainFormLoad: processing field ', iterField);
                let iterSource = this.configDetails.action.form.values[iterField];
                if (this.isDebug) console.log('handleMainFormLoad: mapped to ', iterSource);

                let iterValue = this.context[iterSource];
                if (this.isDebug) console.log('handleMainFormLoad: with value ', iterValue);

                let inputField = this.template.querySelector("lightning-input-field[data-name='" + iterField + "']");
                if (this.isDebug) console.log('handleMainFormLoad: updating inputField ', inputField);

                if (inputField) inputField.value = iterValue;
            }
            if (this.isDebug) console.log('handleMainFormLoad: all default values initialised');
        }
        else {
            if (this.isDebug) console.log('handleMainFormLoad: no default value to initialise');
        }

        let formSpinner = this.template.querySelector('.formSpinner');
        if (this.isDebug) console.log('handleMainFormLoad: hiding formSpinner');
        formSpinner?.classList?.add("slds-hide");

        if (this.isDebug) console.log('handleMainFormLoad: END');
    }

    handleMainAction(event) {
        if (this.isDebug) console.log('handleMainAction: START for title  ',this.title);

        this.actionMessageTitle = null;
        this.actionMessageDetail = null;
        this.actionMessageSeverity = null;
        this.actionCountOK = 0;
        this.actionCountKO = 0;
        this.actionStep = "1";
        this.actionProgress = 0;
        if (this.isDebug) console.log('handleMainAction: action context reset');

        if (this.selection.length == 0) {
            this.actionMessageTitle = PROCESS_ERROR;
            this.actionMessageDetail = NO_SELECT_ERROR;
            this.actionMessageSeverity = 'error';
            this.actionRows = [];
            console.warn('handleMainAction: no record to process ');
        }
        else {
            if (this.isDebug) console.log('handleMainAction: processing #selected records ',this.selection.length);

            if (this.configDetails.filter?.isActive) {
                if (this.configDetails.filter.template) {
                    if (this.isDebug) console.log('handleMainAction: filtering records');
                    this.actionRows = [];
                    this.executeFilter([...this.selection]);
                }
                else {
                    this.actionMessageTitle = CONFIG_ERROR;
                    this.actionMessageDetail = 'No filter template configured!';
                    this.actionMessageSeverity = 'error';
                    console.warn('handleMainAction: no filter template configured');
                }
            }
            else {
                if (this.isDebug) console.log('handleMainAction: no filtering to apply');
                this.actionRows = [... this.selection];
                this.actionStep = "2";
            }
        }

        let tableContainer = this.template.querySelector('.tableContainer');
        if (this.isDebug) console.log('handleMainAction: hiding tableContainer');
        tableContainer.classList.add("slds-hide");

        let headerButtons = this.template.querySelectorAll('.headerButton');
        if (this.isDebug) console.log('handleMainAction: deactivating #headerButtons ',headerButtons.length);
        headerButtons.forEach(item => {
            //if (this.isDebug) console.log('handleMainAction: deactivating headerButton ',item);
            item.disabled = true;
        });

        let actionContainer = this.template.querySelector('.actionContainer');
        if (this.isDebug) console.log('handleMainAction: showing actionContainer');
        actionContainer.classList.remove("slds-hide");

        if (this.isDebug) console.log('handleMainAction: END');
    }

    handleMainCancel(event) {
        if (this.isDebug) console.log('handleMainCancel: START for title  ',this.title);

        let dataTable = this.template.querySelector('lightning-datatable');
        if (this.isDebug) console.log('handleMainCancel: unselecting rows in dataTable ',dataTable);
        dataTable.selectedRows = [];
        this.selection = [];
        if (this.isDebug) console.log('handleMainCancel: refreshing data in dataTable ',dataTable);
        dataTable.data = this.tableData;

        let actionContainer = this.template.querySelector('.actionContainer');
        if (this.isDebug) console.log('handleMainCancel: hiding actionContainer');
        actionContainer.classList.add("slds-hide");

        let tableContainer = this.template.querySelector('.tableContainer');
        if (this.isDebug) console.log('handleMainCancel: showing tableContainer');
        tableContainer.classList.remove("slds-hide");

        let headerButtons = this.template.querySelectorAll('.headerButton');
        if (this.isDebug) console.log('handleMainCancel: reactivating headerButtons');
        headerButtons.forEach(item => {item.disabled = false;});

        if (this.isDebug) console.log('handleMainCancel: END');
    }

    handleMainConfirm(event) {
        if (this.isDebug) console.log('handleMainConfirm: START for title  ',this.title);

        if (!this.configDetails.action.template.row) {
            console.warn('handleMainConfirm: END KO / row mapping missing in template configuration');
            this.actionMessageTitle = CONFIG_ERROR;
            this.actionMessageDetail = 'Missing row mapping in action template configuration!';
            this.actionMessageSeverity = 'error';
            return;
        }
        if (this.configDetails.action.form) {
            if (this.isDebug) console.log('handleMainConfirm: checking input form');
            //let missingList = this.getMissingFields();
            //if (missingList) {
            if (!this.checkMissingFields('mainField')) {
                console.warn('handleMainConfirm: END KO / some required fields are missing');
                this.actionMessageTitle = PROCESS_ERROR;
                this.actionMessageDetail = REQUIRED_FIELDS_ERROR;
                this.actionMessageSeverity = 'warning';
                return;
            }
            else {
                if (this.isDebug) console.log('handleMainConfirm: input form checked');
            }
        }

        this.actionStep = "3";
        this.actionProgress = 5;
        this.actionMessageTitle = null;
        this.actionMessageDetail = null;
        this.actionMessageSeverity = null;

        let rowTemplate = this.initRowTemplate();
        if (this.isDebug) console.log('handleMainConfirm: row template initialized');

        this.executeAction([...this.actionRows],rowTemplate);
        if (this.isDebug) console.log('handleMainConfirm: END / operation launched');
    }

    

    //----------------------------------------------------------------
    // Utilities
    //----------------------------------------------------------------

    initConfig(jsonString) {
        if (this.isDebug) console.log('initConfig: START with ',jsonString);
        let jsonObject = (jsonString ? JSON.parse(jsonString) : null);
        if (this.isDebug) console.log('initConfig: END with ',jsonObject);
        return jsonObject;
    }

    // Context initialisation
    initContext() {
        if (this.isDebug) console.log('initContext: START ');

        this.context = {};
        if (this.configDetails.context) {
            if (this.isDebug) console.log('initContext: starting context init');

            for (let iterField in this.configDetails.context) {
                if (this.isDebug) console.log('initContext: processing field ',iterField);
                let iterSource = this.configDetails.context[iterField];
                if (this.isDebug) console.log('initContext: with source ',iterSource);
                if (this.isDebug) console.log('initContext: of type ',typeof iterSource);
                if (typeof iterSource === 'object') {
                    if (iterSource.automatic) {
                        switch (iterSource.automatic) {
                            case 'userId' : 
                                if (this.isDebug) console.log('initContext: initializing userId automatic value');
                                this.context[iterField] = this.userId;
                                break;
                            case 'recordId' : 
                                if (this.isDebug) console.log('initContext: initializing recordId automatic value');
                                this.context[iterField] = this.recordId;
                                break;
                            case 'objectApiName' : 
                                if (this.isDebug) console.log('initContext: initializing objectApiName automatic value');
                                this.context[iterField] = this.objectApiName;
                                break;
                            case 'now':
                                if (this.isDebug) console.log('initContext: initializing now automatic value');
                                this.context[iterField] = (new Date()).toISOString();
                                break;
                            case 'today':
                                if (this.isDebug) console.log('initContext: initializing today automatic value');
                                this.context[iterField] = (new Date()).toISOString().slice(0,10);
                                break;
                            case 'yesterday':
                                if (this.isDebug) console.log('initContext: initializing yesterday automatic value');
                                this.context[iterField] = (new Date(new Date().setDate(new Date().getDate() - 1))).toISOString().slice(0,10);
                                break;
                            case 'tomorrow':
                                if (this.isDebug) console.log('initContext: initializing todayLocal automatic value');
                                this.context[iterField] = (new Date(new Date().setDate(new Date().getDate() + 1))).toISOString().slice(0,10);
                                break;
                            case 'lastWeek':
                                if (this.isDebug) console.log('initContext: initializing lastWeek automatic value');
                                this.context[iterField] = (new Date(new Date().setDate(new Date().getDate() - 7))).toISOString().slice(0,10);
                                break;
                            case 'nextWeek':
                                if (this.isDebug) console.log('initContext: initializing nextWeek automatic value');
                                this.context[iterField] = (new Date(new Date().setDate(new Date().getDate() + 7))).toISOString().slice(0,10);
                                break;
                            case 'lastMonth':
                                if (this.isDebug) console.log('initContext: initializing lastMonth automatic value');
                                this.context[iterField] = (new Date(new Date().setMonth(new Date().getMonth() - 1))).toISOString().slice(0,10);
                                break;
                            case 'nextMonth':
                                if (this.isDebug) console.log('initContext: initializing nextMonth automatic value');
                                this.context[iterField] = (new Date(new Date().setMonth(new Date().getMonth() + 1))).toISOString().slice(0,10);
                                break;
                            case 'lastQuarter':
                                if (this.isDebug) console.log('initContext: initializing lastQuarter automatic value');
                                this.context[iterField] = (new Date(new Date().setMonth(new Date().getMonth() - 3))).toISOString().slice(0,10);
                                break;
                            case 'nextQuarter':
                                if (this.isDebug) console.log('initContext: initializing nextQuarter automatic value');
                                this.context[iterField] = (new Date(new Date().setMonth(new Date().getMonth() + 3))).toISOString().slice(0,10);
                                break;
                            case 'lastYear':
                                if (this.isDebug) console.log('initContext: initializing lastYear automatic value');
                                this.context[iterField] = (new Date(new Date().setMonth(new Date().getMonth() - 12))).toISOString().slice(0,10);
                                break;
                            case 'nextYear':
                                if (this.isDebug) console.log('initContext: initializing nextYear automatic value');
                                this.context[iterField] = (new Date(new Date().setMonth(new Date().getMonth() + 12))).toISOString().slice(0,10);
                                break;
                            default:
                                console.warn('initContext: unsupported automatic value source',iterSource.automatic);
                        }
                    }
                    else if (iterSource.userField) {
                        if (this.isDebug) console.log('initContext: registering User field to fetch ',iterSource.userField);
                        if (!this.userFields) this.userFields = [];
                        this.userFields.push('User.' + iterSource.userField);
                    }
                    else if (iterSource.recordField) {
                        if (this.isDebug) console.log('initContext: registering User field to fetch ',iterSource.recordField);
                        if (!this.recordFields) this.recordFields = [];
                        this.recordFields.push(this.objectApiName + '.' + iterSource.recordField);
                    }
                    /*else if (iterSource.fieldName) {
                        if (iterSource.fieldName.startsWith('User.')) {
                            if (this.isDebug) console.log('initContext: registering User field to fetch ',iterSource.fieldName);
                            if (!this.userFields) this.userFields = [];
                            this.userFields.push(iterSource.fieldName);
                        }
                        else {
                            if (this.isDebug) console.log('initContext: registering Record field to fetch ',iterSource.fieldName);
                            if (!this.recordFields) this.recordFields = [];
                            this.recordFields.push(iterSource.fieldName);
                        }
                    }*/
                    else {
                        console.warn('initContext: unsupported value source',JSON.stringify(iterSource));
                    }
                }
                else {
                    if (this.isDebug) console.log('initContext: initializing direct value');
                    this.context[iterField] = iterSource;
                }
            }
            if (this.isDebug) console.log('initContext: userFields updated ', JSON.stringify(this.userFields));
            if (this.isDebug) console.log('initContext: recordFields updated ', JSON.stringify(this.recordFields));
            if (this.isDebug) console.log('initContext: END with context ', JSON.stringify(this.context));
        }
        else {
            if (this.isDebug) console.log('initContext: END / no context to initialise ');
        }
    }
 
    // Table configuration default initialisation (if missing in action configuration)
    getDefaultDisplayConfig() {
        if (this.isDebug) console.log('getDefaultDisplayConfig: START with metadata ', JSON.stringify(this.metadata));  

        if (this.metadata) {
            let displayConfig = [];

            if (this.isDebug) console.log('getDefaultDisplayConfig: registering text fields ', JSON.stringify(this.metadata.strings));
            this.metadata.strings?.forEach(item => {
                displayConfig.push({ label: item, fieldName: item, sortable: true });
            });

            if (this.isDebug) console.log('getDefaultDisplayConfig: registering number fields ', JSON.stringify(this.metadata.numbers));
            this.metadata.numbers?.forEach(item => {
                displayConfig.push({ label: item, fieldName: item, type: 'number', sortable: true });
            });

            if (this.isDebug) console.log('getDefaultDisplayConfig: END with config ', JSON.stringify(this.displayConfig)); 
            return displayConfig;
        }
        else {
            console.warn('getDefaultDisplayConfig: END / no metadata available ');
            return null;
        } 
    }

    // Sorting base method for JSON list ordering
    sortBy = (field, reverse, primer) => {
        var key = primer ?
            function(x) {return primer(x[field])} :
            function(x) {return x[field]};
        //checks if the two rows should switch places
        reverse = !reverse ? 1 : -1;
        return function (a, b) {
            a = (key(a) || '');
            b = (key(b) || '');
            return reverse * ((a > b) - (b > a));
        }
    }

    // Main Action Execution
    executeFilter(rows){
        if (this.isDebug) console.log('executeFilter: START with #rows ',rows.length);

        let filterTemplate = this.configDetails.filter.template;
        if (this.isDebug) console.log('executeFilter: template fetched ',JSON.stringify(filterTemplate));

        let batchSize = this.configDetails.filter.batchSize;
        if (this.isDebug) console.log('executeFilter: batch size fetched ',batchSize);
        let batchRows = rows.splice(0,batchSize);
        if (this.isDebug) console.log('executeFilter: #batch rows fetched ', batchRows.length);
        if (this.isDebug) console.log('executeFilter: #rows remaining ', rows.length);

        if (batchRows?.length > 0) {
            let targetRows = this.prepareFilter(batchRows,filterTemplate);
            if (this.isDebug) console.log('executeFilter: targetRows prepared with #rows ',targetRows.length);

            if (this.isDebug) console.log('executeFilter: context fetched ',JSON.stringify(this.context));

            filterRows({actionName: this.configName, rows: targetRows, context: this.context})
            .then( result => {
                if (this.isDebug) console.log('executeFilter: batch operation executed ',result);
                this.actionProgress = Math.round(100 - (100 * rows.length) / this.selection.length);

                this.actionRows = this.actionRows.concat(this.removeRows(batchRows,result,filterTemplate));
                if (this.isDebug) console.log('executeFilter: actionRows updated ',this.actionRows.length);

                if (rows.length > 0) {
                    if (this.isDebug) console.log('executeFilter: END / triggering next batch operation');
                    this.executeFilter(rows);
                }
                else {
                    if (this.isDebug) console.log('executeFilter: all rows processed');
                    this.actionStep = "2";
                    if (this.actionRows.length == 0) {
                        if (this.isDebug) console.log('executeFilter: END KO / no row to process after filtering');
                        this.actionMessageTitle = PROCESS_ERROR;
                        this.actionMessageDetail = FILTER_ALL_ERROR;
                        this.actionMessageSeverity = 'error';
                    }
                    else {
                        if (this.isDebug) console.log('executeFilter: action rows finalised ',this.actionRows);
                        if (this.isDebug) console.log('executeFilter: END OK with #records ',this.actionRows.length);
                    }
                }
            })
            .catch( error => {
                console.warn('executeFilter: END KO / filter execution error ', error);
                this.actionMessageTitle = PROCESS_ERROR;
                this.actionMessageDetail =  error.body?.message || JSON.stringify(error);
                this.actionMessageSeverity = 'error';
            });
            if (this.isDebug) console.log('executeFilter: batch action execution requested');
        }
        else {
            if (this.isDebug) console.log('executeFilter: no more rows to process ');
            this.actionStep = "2";
            if (this.actionRows.length == 0) {
                if (this.isDebug) console.log('executeFilter: END KO / no row to process after filtering');
                this.actionMessageTitle = PROCESS_ERROR;
                this.actionMessageDetail = FILTER_ALL_ERROR;
                this.actionMessageSeverity = 'error';
            }
            else {
                if (this.isDebug) console.log('executeFilter: action rows finalised ',this.actionRows);
                if (this.isDebug) console.log('executeFilter: END OK with #records ',this.actionRows.length);
            }
        }
    }

    prepareFilter(rows,filterTemplate){
        if (this.isDebug) console.log('prepareFilter: START with #rows ',rows.length);

        let targetRows = [];
        rows.forEach(item => {
            if (this.isDebug) console.log('prepareFilter: processing row ',item);
            //targetRows.push(item[this.keyField]);
            targetRows.push(item[filterTemplate.source]);
            /*let targetItem = {... rowTemplate};
            for (let rowField in rowMapping) {
                //if (this.isDebug) console.log('prepareData: processing field ',rowField);
                let sourceField = rowMapping[rowField];
                //if (this.isDebug) console.log('prepareData: sourceField fetched ',sourceField);
                let fieldValue = item[sourceField];
                //if (this.isDebug) console.log('prepareData: fieldValue fetched ',fieldValue);
                targetItem[rowField] = fieldValue;
            }*/
        });
        if (this.isDebug) console.log('prepareFilter: all target rows prepared ',JSON.stringify(targetRows));

        if (this.isDebug) console.log('prepareFilter: END');
        return targetRows;
    }

    removeRows(sourceRows,targetRows,filterTemplate){
        if (this.isDebug) console.log('removeRows: START with #rows ',sourceRows?.length);

        let filteredRows = [];
        if (targetRows?.length || 0 > 0){
            if (this.isDebug) console.log('removeRows: filtering out #rows ',targetRows?.length);
            filteredRows = [... sourceRows];
            targetRows.forEach(item => {
                if (this.isDebug) console.log('removeRows: processing row ',item);
                let sourceIndex = filteredRows.findIndex(srcItem => srcItem[filterTemplate.source] == item[filterTemplate.target]);
                if (sourceIndex == -1) {
                    if (this.isDebug) console.log('removeRows: row not found ',item);
                }
                else {
                    if (this.isDebug) console.log('removeRows: removing row ', sourceIndex);
                    let sourceItem = filteredRows[sourceIndex];
                    filteredRows.splice(sourceIndex,1);

                    let sourceItemIndex = this.tableData.findIndex(itemData => itemData[this.keyField] == sourceItem[this.keyField]);
                    if (this.isDebug) console.log('removeRows: displayed row index fetched ',sourceItemIndex);

                    let newSourceItem = {... this.tableData[sourceItemIndex]};
                    newSourceItem._status = FILTER_STATUS;
                    newSourceItem._icon = FILTER_ICON;
                    newSourceItem._color = 'slds-text-color_error';
                    newSourceItem._message = null;
                    if (this.isDebug) console.log('removeRows: display row update prepared ',newSourceItem);

                    this.tableData.splice(sourceItemIndex,1,newSourceItem);
                    if (this.isDebug) console.log('removeRows: display row updated ');
                }
            });
        }
        else {
            if (this.isDebug) console.log('removeRows: no row to filter out');
            filteredRows = sourceRows;
        }

        if (this.isDebug) console.log('removeRows: END with #rows ',filteredRows.length);
        return filteredRows;
    }

    checkMissingFields(scope) {
        if (this.isDebug) console.log('getMissingFields: START for scope ',scope);

        let inputFields = this.template.querySelectorAll('lightning-input-field.' + scope);
        if (this.isDebug) console.log('getMissingFields: inputFields fetched ', JSON.stringify(inputFields));

        //let missingFields = [];
        let isOK = true;
        if (inputFields) {
            inputFields.forEach(fieldIter => {
                if (this.isDebug) console.log('getMissingFields: processing fieldName ', fieldIter.fieldName);
                if (this.isDebug) console.log('getMissingFields: with label  ', fieldIter.label);
                if (this.isDebug) console.log('getMissingFields: with value  ', fieldIter.value);
                if (this.isDebug) console.log('getMissingFields: required?  ', fieldIter.required);
                //if (this.isDebug) console.log('checkRequiredFieldsFilled: valid?  ', fieldIter);
                if (this.isDebug) console.log('getMissingFields: null value ?  ', (fieldIter.value == null) );
                if (this.isDebug) console.log('getMissingFields: empty value ?  ', (fieldIter.value === ''));
                if ((fieldIter.required) && ((fieldIter.value == null) || (fieldIter.value === ''))) {
                    // handle value removal of required input field & boolean inputs
                    // Boolean fields appear always as required !
                    console.warn('getMissingFields: missing required field  ', fieldIter.fieldName);
                    fieldIter.setErrors({'errors':[{'message':'Field is required!'}]});
                    //missingFields.push(fieldIter.fieldName);
                    isOK = false;
                }
            });
        }
        //if (this.isDebug) console.log('getMissingFields: END with list ', missingFields);
        if (this.isDebug) console.log('getMissingFields: END with status OK ', isOK);
        //return (missingFields.length > 0 ? missingFields : null);
        return isOK;
    }

    initRowTemplate() {
        if (this.isDebug) console.log('initRowTemplate: START');
        if (this.isDebug) console.log('initRowTemplate: configured template ', JSON.stringify(this.configDetails.action.template));

        let rowTemplate = {... this.configDetails.action.template.base};
        if (this.isDebug) console.log('initRowTemplate: rowTemplate base init ', JSON.stringify(rowTemplate));

        let inputFields = this.template.querySelectorAll('lightning-input-field');
        if (this.isDebug) console.log('getMissingFields: inputFields fetched ', JSON.stringify(inputFields));

        if (this.configDetails.action.template.context) {
            if (this.isDebug) console.log('initRowTemplate: adding context data');
            for (let iterField in this.configDetails.action.template.context) {
                if (this.isDebug) console.log('initRowTemplate: processing field ', iterField);
                let iterSource = this.configDetails.action.template.context[iterField];
                if (this.isDebug) console.log('initRowTemplate: mapped to ', iterSource);
                rowTemplate[iterField] = this.context[iterSource];
            }
            if (this.isDebug) console.log('initRowTemplate: rowTemplate updated with context ', JSON.stringify(rowTemplate));
        }
        else {
            if (this.isDebug) console.log('initRowTemplate: no context data to add');
        }

        if (this.configDetails.action.template.form) {
            if (this.isDebug) console.log('initRowTemplate: adding form data');
            
            for (let iterField in this.configDetails.action.template.form) {
                if (this.isDebug) console.log('initRowTemplate: processing field ', iterField);
                let iterSource = this.configDetails.action.template.form[iterField];
                if (this.isDebug) console.log('initRowTemplate: mapped to ', iterSource);

                let inputField = this.template.querySelector("lightning-input-field[data-name='" + iterSource + "']");
                if (this.isDebug) console.log('initRowTemplate: inputField fetched ', inputField);

                let iterValue = inputField?.value;
                if (this.isDebug) console.log('initRowTemplate: value extracted ', iterValue);
                if (iterValue != null) {
                    if (this.isDebug) console.log('initRowTemplate: value set');
                    rowTemplate[iterField] = iterValue;
                }
                else {
                    if (this.isDebug) console.log('initRowTemplate: ignoring null value');
                }
            }
            if (this.isDebug) console.log('initRowTemplate: rowTemplate updated with form ', JSON.stringify(rowTemplate));
        }
        else {
            if (this.isDebug) console.log('initRowTemplate: no context form to add');
        }

        if (this.isDebug) console.log('initRowTemplate: END');
        return rowTemplate;
    }

    executeAction(rows,rowTemplate) {
        if (this.isDebug) console.log('executeAction: START with #rows  ',rows.length);
        if (this.isDebug) console.log('executeAction: and template ',JSON.stringify(rowTemplate));

        let batchSize = this.configDetails.action.batchSize;
        if (this.isDebug) console.log('executeAction: batch size fetched ',batchSize);
        let batchRows = rows.splice(0,batchSize);
        if (this.isDebug) console.log('executeAction: #batch rows fetched ', batchRows.length);
        if (this.isDebug) console.log('executeAction: #rows remaining ', rows.length);

        if (batchRows?.length > 0) {
            let targetRows = this.prepareData(batchRows,rowTemplate);
            if (this.isDebug) console.log('executeAction: targetRows prepared with #rows ',targetRows.length);

            if (this.isDebug) console.log('executeAction: context fetched ',JSON.stringify(this.context));

            executeAction({actionName: this.configName, rows: targetRows, context: this.context})
            .then( result => {
                if (this.isDebug) console.log('executeAction: batch operation executed with result ',result);
                this.actionProgress = Math.round(100 - (100 * rows.length) / this.selection.length);

                batchRows.forEach((item,index) => {
                    if (this.isDebug) console.log('executeAction: processing row ', item);
                    let itemResult = result[index];
                    if (this.isDebug) console.log('executeAction: result row fetched ', itemResult);

                    let itemIndex = this.tableData.findIndex(itemData => itemData[this.keyField] == item[this.keyField]);
                    if (this.isDebug) console.log('updateSelection: displayed row index fetched ',itemIndex);

                    let newItem = {... this.tableData[itemIndex]};
                    newItem._status = itemResult.status;
                    newItem._icon = itemResult.icon;
                    newItem._color = itemResult.color;
                    newItem._message = itemResult.message;
                    if (this.isDebug) console.log('updateSelection: new item initialized ',newItem);

                    this.tableData.splice(itemIndex,1,newItem);
                    if (this.isDebug) console.log('updateSelection: display row updated ');

                    if (itemResult.isOK) {
                        this.actionCountOK +=1;
                    }
                    else {
                        this.actionCountKO +=1;
                    }
                });
                if (this.isDebug) console.log('updateSelection: batch results processed --> #OK ',this.actionCountOK);
                if (this.isDebug) console.log('updateSelection: batch results processed --> #KO ',this.actionCountKO);

                if (rows.length > 0) {
                    if (this.isDebug) console.log('executeAction: END / triggering next batch operation');
                    this.executeAction(rows,rowTemplate);
                }
                else {
                    if (this.isDebug) console.log('executeAction: All rows processed');
                    this.actionStep = "4";
                    this.actionMessageTitle = STEP_4_MSG;
                    this.actionMessageDetail = STEP_4_DETAILS.replace('{0}',this.actionCountOK + this.actionCountKO).replace('{1}',this.actionCountOK).replace('{2}',this.actionCountKO);
                    //this.actionMessageDetail = '#OK: ' + this.actionCountOK + '\n#KO: ' + this.actionCountKO ;
                    this.actionMessageSeverity = 'success';
                    //let dataTable = this.template.querySelector('lightning-datatable');
                    //dataTable.data = this.tableData;
                    if (this.recordId) {
                        if (this.isDebug) console.log('executeAction: refreshing record ',this.recordId);
                        notifyRecordUpdateAvailable([{recordId: this.recordId}]);
                    }
                    if (this.isDebug) console.log('executeAction: END');
                }
            })
            .catch( error => {
                console.warn('executeAction: END KO / action execution error ',error);
                this.actionMessageTitle = PROCESS_ERROR;
                this.actionMessageDetail =  error.body?.message || JSON.stringify(error);
                this.actionMessageSeverity = 'error';
                this.actionStep = "4";
                /*batchRows.forEach(item => {
                    item._status = 'failed';
                    item._icon = 'standard:incident';
                    item._color = 'slds-text-color_error';
                });*/

                //let dataTable = this.template.querySelector('lightning-datatable');
                //dataTable.data = this.tableData;
            });
            if (this.isDebug) console.log('executeAction: batch action execution requested');
        }
        else {
            if (this.isDebug) console.log('executeAction: END / no more rows to process');
            this.actionStep = "4";
            this.actionMessageTitle = STEP_4_MSG;
            this.actionMessageDetail = STEP_4_DETAILS.replace('{0}',this.actionCountOK + this.actionCountKO).replace('{1}',this.actionCountOK).replace('{2}',this.actionCountKO);
            //this.actionMessageDetail = '#OK: ' + this.actionCountOK + '\n#KO: ' + this.actionCountKO ;
            this.actionMessageSeverity = 'success';

            //let dataTable = this.template.querySelector('lightning-datatable');
            //dataTable.data = this.tableData;
        }
    }

    prepareData(sourceRows,rowTemplate){
        if (this.isDebug) console.log('prepareData: START with #source rows ',sourceRows.length);

        let rowMapping = this.configDetails.action.template.row;
        if (this.isDebug) console.log('prepareData: row mapping fetched ',JSON.stringify(rowMapping));

        let targetRows = [];
        sourceRows.forEach(item => {
            if (this.isDebug) console.log('prepareData: processing row ',item);
            let targetItem = {... rowTemplate};
            for (let rowField in rowMapping) {
                //if (this.isDebug) console.log('prepareData: processing field ',rowField);
                let sourceField = rowMapping[rowField];
                //if (this.isDebug) console.log('prepareData: sourceField fetched ',sourceField);
                let fieldValue = item[sourceField];
                //if (this.isDebug) console.log('prepareData: fieldValue fetched ',fieldValue);
                targetItem[rowField] = fieldValue;
            }
            if (this.isDebug) console.log('prepareData: target row prepared ',targetItem);
            targetRows.push(targetItem);
        });
        if (this.isDebug) console.log('prepareData: all target rows prepared ',JSON.stringify(targetRows));

        if (this.isDebug) console.log('prepareData: END');
        return targetRows;
    }

    handleChange(event) {
        console.log('handleChange: event details ' + event.detail);
    }
}