# ![Logo](/media/Logo.png) &nbsp; SFPEG **Planning** Component

## Introduction

The **sfpegPlanningCmp** component was initially implemented to display a planning of all Campaigns
active upon a given period. It takes a list elements as input and enables to display it as bars:
* leveraging a start / end date or timestamp field
* applying a color dynamically or based on a field
* possibly separating bars via a grouping field

The component is displayed hereafter in the red rectangle, Campaigns being grouped here by RecordType and
coloured by Status.
![sfpegPlanningCmp in action](/media/sfpegPlanningCmp.png)

The component is highly dynamic, in terms of axis sizing, scrollbar activation...
It leverages the latest `D3.js` library to automatically display the bars and time axis.

**This component is still in early beta state.** It works but is still not fully tested in real 
production environments.

## Component Configuration

The component is entirely configurable from the Analytics Studio in edit mode.
![sfpegPlanningCmp Configuration](/media/sfpegPlanningCmpConfig.png)

The following global layout properties are available:
* `Title`: text to be title of the component
* `Title Alignment`: alignment of the title (left, center, right)
* `title Font Size`: font size of the title (in px)
* `x-Axis Scale`: Scaling of the x-Axis (auto, day, week, month...) - _Not implemented yet_
* `y-Axis Size`: Size of the left section containing the group and element labels, as 1/N of the display width
* `Show Legend?`: flag to activate the display of a legend below the planning
* `Show Debug?`: flag to activate debug logs in the browser console 

Other properties enable to control the way each item is displayed within the planning:
* `Grouping` (optional): dimension field to group items together in the y-Axis (the y-Axis only
containing elements if no grouping is set)
* `Element`: dimension field providing the label of each item
* `Category` (optional): dimension field used to colorise each item
* `Category Color` (optional): dimension field providing the actual color to be used for each item
instead of the automatic value determined by the component (the value of which is assumed to be consistent
with `Category`)
* `Start`: dimension (date or datetime) field providing the start of the item (assumed to have a value)
* `End`: dimension (date or datetime) field providing the end of the item (assumed to have a value)
* `Range Start`: enforced minimal value of the displayed date range (instead of using the mininal start
date of all items)
* `Range End`: enforced maximal value of the displayed date range (instead of using the maximal End
date of all items)

## Technical Details

### Color Property Setting

By default, the component assigns color to each category value based on the standard **CRM Analytics**
default theme.

It unfortunately cannot reuse the colors defined on the datasets for the `Category` dimension field.

In order to ensure Dashboard coloring consistency, it is therefore necessary to compute a `Category Color`
dimension defining the actual color code to apply and provide it as input to the component on each item.

A typical SAQL syntax to compute such a `Category Color` is:
```
case 'Code' 
    when "ENC" then "#00B531"
    when "ANNU" then "#B50E03"
    when "ENCREA" then "#98B1FF"
    when "VALENC" then "#4269E9"
    when "PLAN" then "#95FFFF"
    when "TERM" then "#006714"
    when "ERREUR" then "#E6ECF2"
    else "#000000"
end
```

### Range Properties Setting

`Range Start` and `Range End` properties may be set as fixed values in the configuration in 
UTC format (e.g. as ```2022-09-15``` text string).

They may also be determined dynamically from another step in the dashboard leveraging **dynamic bindings**
and the **Advanced Editor**:
```
{
    "parameters": {
        "attributes": {
            ...
            "rangeStart": "{{cell(lens_1.result, 0, \"minDate\").asString()}}",
            "rangeEnd": "{{cell(lens_1.result, 0, \"maxDate\").asString()}}",
            ...
        },
        ...
    },
    ...
}
```
