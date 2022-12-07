
# ![Logo](/media/Logo.png) &nbsp; SFPEG CRMA Components


## Introduction

The ability to implement custom LWC components directly accessible in CRM Analytics studio is a great feature enabling among others  to :
* offer new data display options (e.g. see planning component hereafter)
* provide richer data interaction options (e.g. see mass action component hereafter)


The objectives was to implement LWC components for CRM Analytics as configurable as possible (going further than the initial specific requirements to ensure better reusability) and as consistent as possible with the CRM analytics Dashboard UX.

**These components are still in early beta state.** They work but are still not fully tested in real 
production environments.

* * *

## Package Overview

The package contains a small set of LWC components usable directly in the CRM Analytics Studio to extend
standard Dashboard capabilities (see **Components** of _Lightning Components_ type when editing a Dashboard).

Please click on each component link to access more detailed information.

### **[sfpegPlanningCmp](/help/sfpegPlanningCmp.md)** Component

This LWC component was initially implemented to display a planning of all Campaigns active upon a given period.
It takes a list elements as input and enables to display it as bars:
* leveraging a start / end date or timestamp field
* applying a color dynamically or based on a field
* possibly separating bars via a grouping field

The component is displayed hereafter in the red rectangle, Campaigns being grouped here by RecordType and
coloured by Status.
![sfpegPlanningCmp in action](/media/sfpegPlanningCmp.png)

The component is highly dynamic, in terms of axis sizing, scrollbar activation...
It leverages the latest `D3.js` library to automatically display the bars and time axis.


### **[sfpegMassActionCmp](/help/sfpegMassActionCmp.md)** Component

This component displays an actionable data table within a CRM Analytics Dashboard, letting the
user remain in the Dashboard to execute a mass action on this result set.

It leverages the standard  **[slds-datatable](https://developer.salesforce.com/docs/component-library/bundle/lightning-datatable)** Lightning base component to display the list of values and provide various unitary/mass update, subfilters... on a copy of the input query results to trigger Apex actions with the resulting list.

![sfpegMassActionCmp in action](/media/sfpegMassAction.png)

When executing one of the proposed action, a form is presented to the user to ask for additional input and/or
confirmation before executing it.

![sfpegMassActionCmp interaction](/media/sfpegMassActionMainActionPopup.png)

Typical use case is to leverage a CRM Analytics Dashboard embedded within a Campaign Lightning record page to target Contacts to be added to it as CampaignMembers. This enables the user to remain within the Campaign page (no VF page redirection).

Other use cases are mass reassignment of Accounts to new Owners (with possibly complex filters provided in the Dashboard), mass creation of callback or escalation tasks on Opportunities or Cases... possibly amending information on the selected records before executing the operation.


* * *

## Component Configuration

To be continued

* * *

## Packaging and Deployment

Packaging is done on a per-component basis, each component folder containing
all the technical elements required to display and run it (custom labels, Apex classes...).

Various custom labels are provided (prefixed with the name of the component) to adapt standard
elements displayed at the UX.

* * *

## Technical Details

To be continued

