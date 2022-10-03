/***
* @author P-E GROS
* @date   July 2022
* @description  LWC Component for CRM Analytics to display a Planning from a step with start and end dates
* @see PEG_CRMA package (https://github.com/pegros/PEG_CRMA)
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

import { LightningElement, api } from 'lwc';
import { loadScript }       from 'lightning/platformResourceLoader';
import sfpegD3              from '@salesforce/resourceUrl/sfpegD3';
import LOCALE               from '@salesforce/i18n/locale';
import FROM_LABEL           from '@salesforce/label/c.sfpegPlanningFromLabel';
import TO_LABEL             from '@salesforce/label/c.sfpegPlanningToLabel';
import NO_RESULT_MSG        from '@salesforce/label/c.sfpegPlanningNoResultsMessage';

const COLOR_PALETTE = [
    '#52B7D8', '#E16032', '#FFB03B', '#54A77B', '#4FD2D2', '#E287B2', '#F39653', '#6CCE56', '#F5D73F', '#5296D9', '#EB6E83', '#A9D158'
];

export default class SfpegPlanningCmp extends LightningElement {

    //----------------------------------------------------------------
    // Configuration Parameters
    //----------------------------------------------------------------
    @api title;             // Title of the component
    @api titleAlign;        // Title alignment option (left, center, center)
    @api titleSize;         // Title font size 
    @api xAxisScale;        // Scale of the x-Axis
    @api yAxisSize = 4;     // Width of the of the y-Axis
    @api showLegend;        // Flag to display the legend
 
    @api dsGroup;           // Dimension used to group elements (optional)
    @api dsLabel;           // Dimension used as element Label
    @api dsCategory;        // Dimension used for Colouring (optional)
    @api dsColor;           // Dimension providing the Category Colour to apply (optional)
    @api dsStart;           // Date/Time used as Element Start
    @api dsEnd;             // Date/Time used as Element End

    @api rangeStart;        // Lower Date/Time display range (optional)
    @api rangeEnd;          // Higher Date/Time display range (optional)

    @api isDebug = false;   // Flag to activate debug information
    @api dummy;

    //----------------------------------------------------------------
    // CRM Analytics API Parameters
    //----------------------------------------------------------------  
    // Data provided by the enclosing CRM Analytics Dashboard;
    @api
    get results() {
        return this._results;
    }
    set results(value) {
        if (this.isDebug) console.log('set results: START with ', JSON.stringify(value));
        this._results = value;
        this.isDataReady = true;
        if (this.isD3Loaded) {
            if (this.isDebug) console.log('set results: END / initialising Planning');
            this.refreshPlanning();
        }
        else {
            if (this.isDebug) console.log('set results: END / waiting for D3 Load');
        }
    }
    @api metadata;  // Metadata provided by the enclosing CRM Analytics Dashboard
    @api theme;     // Theme provided by the enclosing CRM Analytics Dashboard
    @api getState;  // Dashboard State retrieval from the enclosing CRM Analytics Dashboard

    //----------------------------------------------------------------
    // Internal Parameters
    //----------------------------------------------------------------  

    // Styling and Display Variables
    planningStyle;      // CSS Styling for the global planning container div (for vertical scrollbar)
    axisClass;          // CSS class of the Y-Axis containing div (for horizontal width ratio)
    containerClass;     // CSS class of the planning SVG containing div (for horizontal width ratio)
    containerWidth;     // Actual display width of the SVG containiong div
    svgWidth  = 10;     // Actual width of the Planning (and X-Axis) SVG component
    svgHeight = 10;     // Actual height of the Planning SVG component

    // Content and Control Variables
    isD3Loaded = false      // D3 library load status
    isDataReady = false;    // Result Data load status
    _results;               // Results provided by Dashboard
    axisData = [];          // Formatted Data for the Y-Axis
    chartData = [];         // Formatted Data for the Planning Chart

    minTS;                  // Lower Date/Time display range
    maxTS;                  // Higher Date/Time display range

    d3DateTimeParse;        // D3 Datetime parser
    d3DateParse;            // D3 Date parser
    d3TimeScale             // D3 hozizontal time scale

    legendData = [];        // Formatted Data for the Legend Display
    legendColors = {};      // Same data as JSON object for mapping

    axisWidth       =  200; // Width of the Y-Axis SVG
    axisHeight      =  200; // Height of the Y-Axis SVG
    planningWidth   =  1000;// Width of the Planning SVG
    planningHeight  =  380; // Height of the Planning SVG
    legendWidth     =  200; // Width of the Legend SVG
    legendHeight    =  15;  // Height of the Legend SVG

    noResultsMessage = NO_RESULT_MSG; // Message displayed when there are no results to display.

    //----------------------------------------------------------------
    // Custom getters
    //----------------------------------------------------------------  
    get titleClass() {
        switch (this.titleAlign) {
            case 'right':   return 'slds-float_right';
            case 'left':    return '';
            default:        return 'slds-align_absolute-center';
        }
    }
    get titleStyle() {
        return "font-size:" + this.titleSize + 'px;'
    }

    get hasData() {
        return ((this.results?.length || 0) > 0);
    }

    //----------------------------------------------------------------
    // CRM Analytics Parameters
    //----------------------------------------------------------------
    connectedCallback() {
        if (this.isDebug) console.log('connected: START with isDebug ', this.isDebug);
        if (this.isDebug) console.log('connected: START with title ', this.title);
        if (this.isDebug) console.log('connected: title align configured ', this.titleAlign);
        if (this.isDebug) console.log('connected: title size configured', this.titleSize);

        // Y Axis computation
        if (this.isDebug) console.log('connected: Y axis size configured ', this.yAxisSize);
        this.axisClass = 'axisContainer slds-col slds-size_1-of-' + this.yAxisSize + ' slds-grid slds-wrap slds-grid_vertical-align-start';
        if (this.isDebug) console.log('connected: axisClass init ', this.axisClass);
        this.containerClass = 'mainContainer slds-col slds-size_' + (this.yAxisSize - 1) + '-of-' + this.yAxisSize;
        if (this.isDebug) console.log('connected: containerClass init ', this.containerClass);

        if (this.isDebug) console.log('connected: metadata provided ', JSON.stringify(this.metadata));
        if (this.isDebug) console.log('connected: theme provided ', JSON.stringify(this.theme));

        /*this.svgWidth = 800;
        this.svgHeight = 30 * (this.results?.length || 1) ;*/

        // D3 library load
        if (!this.isD3Loaded) {
            loadScript(this, sfpegD3)
            .then( () => {
                if (this.isDebug) console.log('connected: D3 loaded');
                this.isD3Loaded = true;
                if (this.isDataReady) {
                    if (this.isDebug) console.log('connected: END / initialising Planning'); 
                    this.refreshPlanning();
                }
                else {
                    if (this.isDebug) console.log('connected: END / waiting for Data');
                }
            }).catch(error => {
                console.warn('connected: END KO while loading D3  / ', error);
            });
            if (this.isDebug) console.log('connected: loading D3');
        }
        else {
            if (this.isDebug) console.log('connected: END');
        }
    }

    renderedCallback() {
        if (this.isDebug) console.log('rendered: START with title ', this.title);

        let rootContainer = this.template.querySelector('.rootContainer');
        if (this.isDebug) console.log('rendered: rootContainer ',rootContainer);
        let titleContainer = this.template.querySelector('.titleContainer');
        if (this.isDebug) console.log('rendered: titleContainer ',titleContainer);
        let legendContainer = this.template.querySelector('.legendContainer');
        if (this.isDebug) console.log('rendered: legendContainer ',legendContainer);

        let planningHeight = rootContainer.clientHeight - (titleContainer?.offsetHeight || 0) - (legendContainer?.offsetHeight || 0);
        this.planningStyle = '--planningHeight:' + planningHeight + 'px;';
        if (this.isDebug) console.log('rendered: planningStyle ', this.planningStyle);

        let mainContainer = this.template.querySelector('.mainContainer');
        if (this.isDebug) console.log('rendered: mainContainer ',mainContainer);
        this.containerWidth = mainContainer?.offsetWidth || 0;
        if (this.isDebug) console.log('rendered: containerWidth ', this.containerWidth);

        if (this.isDebug) console.log('rendered: DB State fetched ', JSON.stringify(this.getState()));

        if (this.isDebug) console.log('rendered: END');
    } 

    refreshPlanning() {
        if (this.isDebug) console.log('refreshPlanning: START with _results ', JSON.stringify(this._results));
        if (this._results.length == 0) {
            if (this.isDebug) console.log('refreshPlanning: END / no data to display ');
            return;
        }

        // Determining min and max dates and sizing the SVG
        this.initPlanningRange();
        if (this.isDebug) console.log('refreshPlanning: groups field ', this.dsGroup);
        if (this.isDebug) console.log('refreshPlanning: containerWidth ', this.containerWidth);
        if (this.isDebug) console.log('refreshPlanning: delta date ', (this.maxTS - this.minTS));
        if (this.isDebug) console.log('refreshPlanning: delta ', (this.maxTS.valueOf() - this.minTS.valueOf()) / (24 * 3600 * 100));
        this.svgWidth = Math.max((this.maxTS.valueOf()  - this.minTS.valueOf() ) / (24 * 3600 * 100), this.containerWidth);
        this.svgHeight = this._results.length * 26;
        if (this.isDebug) console.log('refreshPlanning: svgHeight reset ', this.svgHeight);
        if (this.isDebug) console.log('refreshPlanning: svgWidth reset ', this.svgWidth);
        this.d3TimeScale = d3.scaleTime()
            .domain([this.minTS,this.maxTS])
            .range([10, this.svgWidth - 10]);
        if (this.isDebug) console.log('refreshPlanning: d3TimeScale init ', this.d3TimeScale);

        // Preparing Horizontal Axis
        let mainAxis = d3.axisBottom(this.d3TimeScale)
                        .ticks(Math.round(this.svgWidth / 125))
                        .tickSize(this.svgHeight, 1);
        if (this.isDebug) console.log('refreshPlanning: main Grid Axis set',mainAxis);

        let mainSvg = d3.select(this.template.querySelector('.mainSvg'));
        let mainGrid = mainSvg
                .call(g => g.select(".mainGrid").remove())
                .append('g')
                    .attr('class', 'mainGrid')
                    .attr('color', 'lightgrey')
                    .attr('stroke', 'lightgrey')
                .call(mainAxis)
                .selectAll("path")  
                    .style("display", "none");
        if (this.isDebug) console.log('refreshPlanning: main grid added',mainGrid);

        if (this.isDebug) console.log('refreshPlanning: d3.timeFormat("%m-%d") ',d3.timeFormat("%m-%d"));
        if (this.isDebug) console.log('refreshPlanning: of type ', typeof d3.timeFormat("%m-%d"));        
        let xAxis = d3.axisBottom(this.d3TimeScale)
                        //.tickFormat(d3.timeFormat("%m-%d"))
                        .tickFormat(Intl.DateTimeFormat(LOCALE).format)
                        .ticks(Math.round(this.svgWidth / 125))
                        .tickSize(0,0);
        let axisSvg = d3.select(this.template.querySelector('.timeAxis'));
        if (this.isDebug) console.log('refreshPlanning: X Axis Labels set',xAxis);
        let axisGrid = axisSvg
                .call(g => g.select(".axisGrid").remove())
                .append('g')
                    .attr('class', 'axisGrid')
                    .attr('font-size', '12px')
                    .attr('opacity', '0.5')
                .call(xAxis)
                .selectAll("text")  
                    .attr("dy", '14px')
                    .style("text-anchor", "center")
                    .style("font-size", "12px");
        axisSvg.select('.axisGrid')
                .selectAll("path")  
                .style("display", "none");
        if (this.isDebug) console.log('refreshPlanning: axis grid added',axisGrid);

        // Preparing Data
        if (this.isDebug) console.log('refreshPlanning: groups field ', this.dsGroup);
        if (this.isDebug) console.log('refreshPlanning: label field ', this.dsLabel);
        if (this.isDebug) console.log('refreshPlanning: category field ', this.dsCategory);
        if (this.isDebug) console.log('refreshPlanning: color field ', this.dsColor);
        this.axisData = [];
        this.chartData = [];
        this.legendData = [];
        this.legendColors = {};

        if (this.dsGroup) {
            if (this.isDebug) console.log('refreshPlanning: preparing grouped data');
            let currentItem = {label: (this.results[0])[this.dsGroup], index: 'group_0', indexElt: 'items_', items: []};
            this.axisData.push(currentItem);
            this._results.forEach((item, index) => {
                if (this.isDebug) console.log('refreshPlanning: processing item # ', index);
                if (this.isDebug) console.log('refreshPlanning: with data ', JSON.stringify(item));

                if (item[this.dsGroup] != currentItem.label) {
                    if (this.isDebug) console.log('refreshPlanning: registering new category ', item[this.dsGroup]);
                    currentItem = {label: item[this.dsGroup], index: 'group_' + this.axisData.length, indexElt: 'items_' + this.axisData.length, items: []};
                    this.axisData.push(currentItem);
                }

                currentItem.items.push({label: item[this.dsLabel], index: 'item_' + index, data: item});
                this.chartData.push(this.initPlanningItem(item,index));
            });
        }
        else {
            if (this.isDebug) console.log('refreshPlanning: preparing flat data');
            this._results.forEach((item, index) => {
                if (this.isDebug) console.log('refreshPlanning: processing item # ', index);
                if (this.isDebug) console.log('refreshPlanning: with data ', JSON.stringify(item));

                this.axisData.push({label: item[this.dsLabel], index: 'item_' + index, data: item});
                this.chartData.push(this.initPlanningItem(item, index));
            });
        }
        if (this.isDebug) console.log('refreshPlanning: axisData prepared ', JSON.stringify(this.axisData)); 
        if (this.isDebug) console.log('refreshPlanning: chartData prepared ', JSON.stringify(this.chartData)); 
        if (this.isDebug) console.log('refreshPlanning: rangeData prepared ', JSON.stringify(this.rangeData)); 
        if (this.isDebug) console.log('refreshPlanning: legendData prepared ', JSON.stringify(this.legendData)); 
        if (this.isDebug) console.log('refreshPlanning: legendColors prepared ', JSON.stringify(this.legendColors)); 
        if (this.isDebug) console.log('refreshPlanning: END');
    }

    initPlanningRange() {
        if (this.isDebug) console.log('initPlanningRange: START'); 
        if (this.isDebug) console.log('initPlanningRange: Start field ', this.dsStart);
        if (this.isDebug) console.log('initPlanningRange: End field ', this.dsEnd);

        if (this._results.length == 0) {
            if (this.isDebug) console.log('initPlanningRange: END / no data to process'); 
            return;
        }

        this.minTS = null;
        this.maxTS = null;
        if (this.isDebug) console.log('initPlanningRange: Display Range Start ', this.rangeStart);
        if (this.rangeStart) this.minTS = this.rangeStart;
        if (this.isDebug) console.log('initPlanningRange: Display Range End ', this.rangeEnd);
        if (this.rangeEnd) this.maxTS = this.rangeEnd;

        if (!this.rangeStart || !this.rangeEnd) {
            if (this.isDebug) console.log('initPlanningRange: Computing automatic display range ');

            this._results.forEach(item => {
                if ((!this.rangeStart) && ((!this.minTS) || (this.minTS > item[this.dsStart]))) {
                    this.minTS = item[this.dsStart];
                }
                if ((!this.rangeEnd) && ((!this.maxTS) || (this.maxTS < item[this.dsEnd]))){
                    this.maxTS = item[this.dsEnd];
                }
            });
        }
        if (this.isDebug) console.log('initPlanningRange: min TS determined ', this.minTS);
        if (this.isDebug) console.log('initPlanningRange: max TS determined ', this.maxTS);
        if (!this.minTS) this.minTS = this.maxTS || new Date();
        if (!this.maxTS) this.maxTS = this.minTS || new Date();
        if (this.isDebug) console.log('initPlanningRange: min TS reworked ', this.minTS);
        if (this.isDebug) console.log('initPlanningRange: max TS reworked ', this.maxTS);

        if (!this.d3DateTimeParse)  this.d3DateTimeParse = d3.utcParse("%Y-%m-%dT%H:%M:%S.%LZ");
        if (!this.d3DateParse)      this.d3DateParse = d3.utcParse("%Y-%m-%d");
        
        this.minTS = this.d3DateTimeParse(this.minTS) || this.d3DateParse(this.minTS);
        if (this.isDebug) console.log('initPlanningRange: min TS reset ', this.minTS);
        this.maxTS = this.d3DateTimeParse(this.maxTS) || new Date((this.d3DateParse(this.maxTS)).setHours(23, 59, 59, 999));
        if (this.isDebug) console.log('initPlanningRange: max TS reset ', this.maxTS);
        
        if (this.isDebug) console.log('initPlanningRange: END'); 
    }

    initPlanningItem(item,index) {
        if (this.isDebug) console.log('initPlanningItem: START for item # ',index); 

        let itemStart = this.d3TimeScale(this.d3DateTimeParse(item[this.dsStart] || this.minTS) || this.d3DateParse(item[this.dsStart] || this.minTS));
        if (this.isDebug) console.log('initPlanningItem: item start init ',itemStart);
        let itemEnd = this.d3TimeScale(this.d3DateTimeParse(item[this.dsEnd] || this.maxTS) || new Date (this.d3DateParse(item[this.dsEnd] || this.maxTS).setHours(23, 59, 59, 999)));
        if (this.isDebug) console.log('initPlanningItem: item end init ',itemEnd);
        if (this.isDebug) console.log('initPlanningItem: item length ', itemEnd - itemStart);

        // Managing Chart data (chartData)
        let planningItem = { 
            index: index,
            data: item,
            x: itemStart,
            y: index * 26 + 2,
            length: Math.max((itemEnd - itemStart),5)
            //color: COLOR_PALETTE[index % 6]
        };

        // Managing Color and Legend
        if (this.dsColor) {
            if (!this.legendColors[item[this.dsCategory]]) {
                if (this.isDebug) console.log('initPlanningItem: registering new category ', item[this.dsCategory]);
                if (this.isDebug) console.log('initPlanningItem: with color ', item[this.dsColor]);
                this.legendColors[item[this.dsCategory]] = item[this.dsColor];
                this.legendData.push({label: item[this.dsCategory], style: '--circleColor:' + item[this.dsColor] + ';'});
            }
            planningItem.color = this.legendColors[item[this.dsCategory]];
        }
        else if (this.dsCategory) {
            if (!this.legendColors[item[this.dsCategory]]) {
                if (this.isDebug) console.log('initPlanningItem: registering new category ', item[this.dsCategory]);
                let categoryColor = COLOR_PALETTE[this.legendData.length % COLOR_PALETTE.length];
                if (this.isDebug) console.log('initPlanningItem: with color ', categoryColor);
                this.legendColors[item[this.dsCategory]] = categoryColor;
                this.legendData.push({label: item[this.dsCategory], style: '--circleColor:' + categoryColor + ';'});
            }
            planningItem.color = this.legendColors[item[this.dsCategory]];
        }
        else {
            if (!this.legendColors.default) {
                this.legendColors.default = COLOR_PALETTE[0];
                this.legendData.push({label: '---', style: '--circleColor:' + COLOR_PALETTE[0] + ';'});
            }
            planningItem.color = COLOR_PALETTE[0];
        }

        if (this.isDebug) console.log('initPlanningItem: END / returning ', JSON.stringify(planningItem)); 
        return planningItem;
    }

    //----------------------------------------------------------------
    // Popup Display Management
    //---------------------------------------------------------------- 
    showPopup(event) {
        if (this.isDebug) console.log('showPopup: START with ', event);
        let popupDiv = this.template.querySelector('.elementPopup');

        let index = event.toElement.dataset.index;
        if (this.isDebug) console.log('showPopup: item index fetched ', index);

        if (!index) {
            console.warn('showPopup: END KO / missing index on item');
            return;
        }
        let item = this.chartData[index];
        if (this.isDebug) console.log('showPopup: item index fetched ', JSON.stringify(item));
        if ((!item) || (!item.data)) {
            console.warn('showPopup: END KO / item not found for index ', index);
            return;
        }

        let tag  = '<p class="slds-text-title_bold slds-m-bottom_xx-small">' + (item.data)[this.dsLabel] + '</p>'
                //+ '<p class="slds-text-body_small slds-m-bottom_xx-small">' + item.index + '</p>'
                + (this.dsGroup ? '<p class="slds-text-body_small slds-m-bottom_xx-small">' + (item.data)[this.dsGroup] + '</p>' : '')
                + (this.dsCategory ? '<p class="slds-text-body_small slds-m-bottom_xx-small">' + (item.data)[this.dsCategory] + '</p>' : '')
                + '<p class="slds-text-body_small slds-m-bottom_xx-small">' + FROM_LABEL + ' '
                    /*+ (     Intl.DateTimeFormat(LOCALE,{dateStyle:'short',timeStyle:'short'}).format(this.d3DateTimeParse(item.data[this.dsStart]))
                        ||  Intl.DateTimeFormat(LOCALE).format(this.d3DateParse(item.data[this.dsStart])))*/
                    + (((item.data)[this.dsStart]).length > 10
                        ? Intl.DateTimeFormat(LOCALE,{dateStyle: 'short',timeStyle:'short'}).format(new Date((item.data)[this.dsStart]))
                        : Intl.DateTimeFormat(LOCALE).format(new Date((item.data)[this.dsStart]))) + "</p>"
                + '<p class="slds-text-body_small">' + TO_LABEL + ' '
                    /*+ (     Intl.DateTimeFormat(LOCALE,{dateStyle:'short',timeStyle:'short'}).format(this.d3DateTimeParse(item.data[this.dsEnd]))
                        ||  Intl.DateTimeFormat(LOCALE).format(this.d3DateParse(item.data[this.dsEnd])));*/
                    + (((item.data)[this.dsEnd]).length > 10
                        ? Intl.DateTimeFormat(LOCALE,{dateStyle: 'short',timeStyle:'short'}).format(new Date((item.data)[this.dsEnd]))
                        : Intl.DateTimeFormat(LOCALE).format(new Date((item.data)[this.dsEnd]))) + "</p>"
                    //+ Intl.DateTimeFormat(LOCALE,{dateStyle: 'short', timeStyle: 'short'}).format(new Date((item.data)[this.dsEnd])) + '</p>';
        if (this.isDebug) console.log('showPopup: popup content init ', tag);
        popupDiv.innerHTML = tag;

        this.movePopup(event);
        if (this.isDebug) console.log('showPopup: popup located ');

        popupDiv.classList.remove("slds-hide");
        if (this.isDebug) console.log('showPopup: END / popup displayed');
    }
    movePopup(event) {
        if (this.isDebug) console.log('movePopup: START with ',event);
        let popupDiv = this.template.querySelector('.elementPopup');

        if (this.isDebug) console.log('movePopup: inner width fetched ', window.innerWidth);
        if (event.layerX < window.innerWidth / 2) {
            if (this.isDebug) console.log('movePopup: display popup left with layerX ', event.layerX);
            let x = (event.layerX + 15) + "px";
            popupDiv.style.left = x;
            popupDiv.style.right = null;
        }
        else {
            if (this.isDebug) console.log('movePopup: display popup right with layerX ', event.layerX);
            let x = (window.innerWidth - event.layerX - 5) + "px";
            popupDiv.style.right = x;
            popupDiv.style.left = null;
        }
        if (this.isDebug) console.log('movePopup: layerY from event ', event.layerY);
        let y = event.layerY - 15 + "px";
        popupDiv.style.top = y;

        if (this.isDebug) console.log('movePopup: END');
    }
    hidePopup(event) {
        if (this.isDebug) console.log('hidePopup: START with ',event);
        let popupDiv = this.template.querySelector('.elementPopup');
        popupDiv.classList.add("slds-hide");
        if (this.isDebug) console.log('hidePopup: END');
    }
}