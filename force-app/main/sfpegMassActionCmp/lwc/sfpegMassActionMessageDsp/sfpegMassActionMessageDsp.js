/***
* @author P-E GROS
* @date   Sept 2022
* @description  Display Utility LWC component to show a message in a structured way.
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

const MSG_VARIANTS = {
    info: {
        icon: "utility:info"
    },
    warning: {
        icon: "utility:warning",
        variant: "warning",
        class: "slds-text-color_warning"
    },
    error: {
        icon: "utility:error",
        variant: "error",
        class: "slds-text-color_error"
    },
    success: {
        icon: "utility:success",
        variant: "success",
        class: "slds-text-color_success"
    }
}

export default class SfpegMassActionMessageDsp extends LightningElement {

    //----------------------------------------------------------------
    // Configuration Parameters
    //----------------------------------------------------------------  
    @api variant = 'info';
    @api title;
    @api message;

    //----------------------------------------------------------------
    // Configuration Getters
    //---------------------------------------------------------------- 
    get iconName() {
        return MSG_VARIANTS[this.variant]?.icon || 'utility:question';
    }
    get iconVariant() {
        return MSG_VARIANTS[this.variant]?.variant;
    }
    get titleClass() {
        return 'slds-text-title_bold ' + MSG_VARIANTS[this.variant]?.class;
    }

}