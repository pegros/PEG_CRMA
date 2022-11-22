---
# SFPEG Mass Action Component
---

## Introduction

This component displays an actionable data table within a CRM Analytics Dashboard, letting the
user remain in the Dashboard to execute a mass action on this result set.

It leverages the standard  **[slds-datatable](https://developer.salesforce.com/docs/component-library/bundle/lightning-datatable)** Lightning base component to display the list of values and provide various unitary/mass update, subfilters... on a copy of the input query results to trigger Apex actions with the resulting list.

![sfpegMassActionCmp in action](/media/sfpegMassAction.png)

When executing one of the proposed action, a form is presented to the user to ask for additional input and/or confirmation before executing it.

![sfpegMassActionCmp interaction](/media/sfpegMassActionMainActionPopup.png)

Typical use case is to leverage a CRM Analytics Dashboard embedded within a Campaign Lightning record page to target Contacts to be added to it as CampaignMembers. This enables the user to remain within the Campaign page (no VF page redirection).

Other use cases are mass reassignment of Accounts to new Owners (with possibly complex filters provided in the Dashboard), mass creation of callback or escalation tasks on Opportunities or Cases... possibly amending information on the selected records before executing the operation.

**⚠️ This component is still in early beta state**. It works but has not been used yet on production environments. It aims at completely replacing the component provided by the **[PEG_TCRM](https://github.com/pegros/PEG_TCRM)** package byproviding the following added value:
* LWC instead of Aura implementation (better performances)
* more native support of the CRM Analytics capabilities (data are produced by the Dashboard and injected into the component vs reverse engineering of teh current filter state to generate a SAQL query to re-fetch the data)
* native usage within CRM Analytices and not only for Dashboards embedded within Lightning pages.

---
## Component Overview

### Main Action Processing

A typical use case is to start from a main Dashboard enabling to filter various Salesforce core data and
display important related KPIs.
From this dashboard, various action buttons (here isolated on the top right) enable to access
special Dashboard tabs hidden from the standard navigation.

![Navigation Entry](/media/sfpegMassActionEntry.png)

When clicking on one action button (e.g. "Add to Campaign" / "Ajout Campagne"), an action dedicated tab is 
displayed to the user, with the list of records eligible to the action (provided by the Dashboard according
to the filters applied).

![Main Action Screen](/media/sfpegMassActionStep1.png)

From this page, the user selects the actual records on which the action should be applied (_select all_ option
being possible). The user may also sort them to check possible issues and unselect special records.

When triggering the actual operation (brand color header button), a 4 step process is launched
1. eligibility control of the selected records (optional), e.g. to filter out records already processed  
2. information entry (optional) and action confirmation
3. action execution (progressive in batches)
4. action execution summary


Typically, after having selected rows and triggered the operation, the (optional) filtering happens
and the step #2 popup form gets displayed. 

![Action Confirmation Screen](/media/sfpegMassActionStep2.png)

Once the user enters the required data and confirms the operation, the execution is launched and 
a progress bar is displayed.

![Action Execution Screen](/media/sfpegMassActionStep3.png)

Once all records have been processed a summary of the operation is presented, with details about failures vs 
succcesses.

![Action Summary Screen](/media/sfpegMassActionStep4.png)

After having closed the operation popup, the user gets back to the original list, with status information
for each processed record.

![Main Action Screen with Status Display](/media/sfpegMassActionStep5.png)


### Display (local) Action Processing

Before actually launching the operation, it is possible to rework somehow the records presented in the 
main data table via additional local header buttons (displayed in neutral instead of brand variant).
These modifications apply only locally on the data displayed in the component (i.e. not in Salesforce
core database nor in CRM Analytics one) but will be used when executing the main operation.

This enables to prepare data in a more targeted way than with the main action form (at step #2) and even 
roll back to the original configuration.

Typically, after having selected rows and triggered the local operation, a popup form gets displayed. 

![Local Action Form Screen](/media/sfpegMassActionLocalStep2.png)

Once the user enters the required data (here a Task subject and due date) and confirms the local
operation, the records are updated and their status updated.

![Main Action Screen with Local Action Status](/media/sfpegMassActionLocalStep3.png)

Afterwards, when executing the main action, the updated information on the records (here the subject 
and due date of Tasks to create) is primarily used and the row status gets further updated.

![Main Action Screen with Main Action Status](/media/sfpegMassActionLocalStep5.png)


### Component Access Control

The access to the component in the Dashboard may be simply controlled via **Custom Permissions**.

If a **Custom Permission** name is set in the Action configuration, any user not having it in their
permissions will get an access error message.

![Action Access Denied](/media/sfpegMassActionPermissionControl.png)


***
## Component Configuration

Configuration of this component is done at two levels:
* in the **Analytics Studio** Dashboard editor, mainly consisting in standard data **query** configuration
* via **sfpegMassAction** custom metadata records for display and action configuration

A standard / default **sfpegMassActionSoqlDml_SVC** Apex class is available to execute standard SOQL
based controls and DML (insert / update / delete) operations. If needed, custom filter / action logic
may be added in Apex (by implementing the **sfpegMassAction_SVC** virtual class interface) and used in
this configuration.

### **Analytics Studio** Configuration

After having selected the **SFPEG Mass Action** component in the Dashboard editor, 
the underlying Query needs to be configured first. It is possible to come back
any time to the query via the standard query editor action (shown in red below).

![sfpegMassActionCmp Query Configuration](/media/sfpegMassActionConfig1.png)

**Beware** to select at least one dimension uniquely identifying the rows to be
displayed in the data table. Otherwise row selection will fail when using the
component if duplicates are found !

This unique key dimension must then be set in the `Key Field`property when
opening the _Component Attributes_ (shown in blue below).

![sfpegMassActionCmp Component Configuration](/media/sfpegMassActionConfig2.png)

The second most important property is then `Configuration` which should provide
the Developer Name of the **sfpegMassAction** metadata record providing the 
most detailed configuration.

Other properties enable to:
* set a title content and size 
* provide contextual information about a specific record, e.g. leveraging
dynamic bindings to provide the Object Name and record ID of a selected 
record elsewhere in the Dashboard or of the page record when embedding the
Dashboard in a Lightning record page.
* activate debug logs in the console

### **Metadata** Configuration

Most of the detailed configuration is done in **sfpegMassAction** custom
metadata records.

![sfpegMassActionCmp Metadata Configuration](/media/sfpegMassActionConfigMeta.png)

This configuration consists in the following main areas:
* **General** information, mainly providing naming and description of the record
    * the `Permission` property enabling to control access to the metadata record
    (i.e. only Users with the specified Custom Permission may access this record,
    see **Component Access Control** above)

* Component **context** data setting the elements required by the various actions
(and filter) to contextualise the execution to the current user, date...
    * the `Context` property mainly consists in a stringified JSON object with various
    fields defining their value statically or dynamically
    * when opting for a dynamic value, the value should be specified as a JSON object
    in `{"origin":"source"}` global format.
    * the origin may be the **current User**, in which case the source should be the API name
    of the User field to be used (e.g. `{"userField":"Email"}`)
    * the origin may be the **current record** if the **Object Name**  and **Record Id** properties 
    have been set in the Analytics Studio configuration, in which case the source should be the API name
    of the Object field to be used (e.g. `{"recordField":"Name"}`)
    * the origin may be **automatic**, in which case the source should have one of the following values:
        * `userId` to get the current User Id (e.g. `{"automatic":"userId}`)
        * `objectApiName` or `recordId` to fetch the corresponding information from the current record
        (if the Analytics Studio properties have been set, see above)
        * `now` to fetch the current timestamp
        * `today`, `tomorrow`, `yesterday`, `nextWeek`, `lastWeek`, `nextMonth`, `lastMonth`, `nextQuarter`,
        `lastQuarter`, `nextYear`, `lastYear` to fetch date values relative to the current day

As an example, the following context value would provide the current user ID, his name and email,
the name of the current record, the date one week from today and a fixed "P2" task priority value.
```
{
    "UserId":       {"automatic":"userId"},
    "UserName":     {"userField":"Name"},
    "UserEmail":    {"userField":"Email"},
    "RecordName":   {"recordField":"Name"},
    "TargetDate":   {"automatic":"nextWeek"},
    "TaskPriority": "P2"
}
```

* Component **display** configuration, defining the way data provided by the Dashboard should be presented
in the datatable, as well as how the main action should be displayed or which additional _local_ actions 
are available.
    * the `Display Config` provides the configuration of the underlying
    **[lightning-datatable](https://developer.salesforce.com/docs/component-library/bundle/lightning-datatable/documentation)**
    component and consists in a stringified JSON configuration object (see standard documentation for details
    about the `columns`property)
    
As an example, the following configuration enables to select max 100 records in a datatable displaying
5 columns with 4 fields from the rows provided by the Dashboard and 1 technical `_status` managed by the
component.
```
{
    "hideCheckboxColumn": false,
    "maxRowSelection": 100,
    "columns": [
        {   "label":"Code postal",  "fieldName":"Code_postal",  "sortable":true,
            "cellAttributes": {"class":{"fieldName":"_color"}}},
        {   "label":"Département",  "fieldName":"Code_departement", "sortable":true,
            "cellAttributes": {"class":{"fieldName":"_color"}}},
        {   "label":"Nombre",   "fieldName":"count",    "type":"number",    "sortable":true},
        {   "label":"Valeur foncière",  "fieldName":"sum_Valeur_fonciere",  "type":"number",    "sortable":true},
        {   "fieldName":"_status",  "type":"text",  "sortable":true,
            "cellAttributes": { "iconName":{"fieldName":"_icon"},"iconPosition": "right",
                                "title":{"fieldName":"_message"}},
            "initialWidth": 100,"iconName": "utility:stage","hideLabel": true}
    ]
}
```
`

    * the `Action Label`,  `Action Title` and `Action Message` properties define the main action
    button label and the title and help message of the displayed action popup.

    * the `Display Actions` define the set of _local_ actions to be provided in addition to the main one, as
    a stringified JSON list of action configuration objects, consisting in:
        * a `label` for button display and `name` for action unique identification
        * a `title` and `message` for the action popup header title and main message
        * a `type`, i.e. `update` for field updates on the selected rows or `reset` to reset the selected
        rows to their orginal states
        * `status`, `icon` and `color` (optional) properties to update the corresponding technical fields
        * a `form` to define the content of the action popup form in terms of fields proposed for user input
        (see main action section below for more details)
        * a `template` to define the set of fields to be set/updated on the selected rows as well as the
        origin of their values (see main action section below for more details)


The following configuration examples defines 3 actions, the first resetting the selected records,
the second simply updating the technical status of the selected rows (to a fixed custom _excluded_ value),
the last updating the _Subject_ of selected records with the Name entered in a form (and updating the 
status to _updated_ value)

```
[
    {   "label":"Reset",    "name":"reset", "type":"reset",
        "title":"Roll-back to initial state",
        "message":"Confirm to undo all changes!"},
    {   "label":"Exclude",  "name":"exclude",   "type":"update",
        "title":"Mark as excluded",
        "status":"excluded",    "icon":"standard:record_delete",    "color":"slds-text-color_error"},
    {   "label":"Change Subject", "name":"changeSubject",   "type":"update",
        "title":"Modify Subject",
        "status":"updated", "icon":"custom:custom18",   "color":"slds-text-color_success",
        "form":{    "objectApiName":"TaskProxy__c", "size":12,
                    "fields": [{"name":"Name","required":true}]},
        "template":{"form":{"Subject":"Name"}}}
]
```

* Component data **filtering** (for the main action)

🚧 to be completed....


* Component **action** execution

🚧 to be completed....


### Row Status Properties

When executing operations, various 
_status
_icon
_color
_message


### Baseline Apex Logic

As a baseline the **sfpegMassActionSoqlDml** Apex class is provided with the package
to execute:
* SOQL based filtering of rows to be processed
* insert/update/delete DML operations in _all-or-none_ or _best effort_ modes



### Apex Logic Extension

It is however possible to replace this baseline logic by implementing any Apex
class extending the virtual **sfpegMassAction_SVC** class. Two methods are 
available respectively to **filterRows** and/or **executeAction**.

The standard **sfpegMassActionSoqlDml** provides an example of such an implementation.

🚧 to be completed....

***
## Technical Details

This component relies on the standard **[lightning-datatable](https://developer.salesforce.com/docs/component-library/bundle/lightning-datatable/documentation)** component for data display.
All of the data display configuration of the **sfpegMassActionCmp** component directly depend on the capabilities
of this base component.

Forms displayed in the component rely on the standard **[lightning-record-edit-form](https://developer.salesforce.com/docs/component-library/bundle/lightning-record-edit-form/documentation)** component in creation mode.
Therefore, only objects supported by this component may be used, thus requiring the use of 
_Custom Proxy Objects_ in certain cases (e.g. for _Tasks_ as shown in some examples).
