import { LightningElement } from 'lwc';
import { CloseActionScreenEvent } from 'lightning/actions';
import { NavigationMixin } from 'lightning/navigation';

export default class NewAccount extends NavigationMixin(LightningElement) {
    handleCancel() {
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    handleSuccess(event) {
        this.dispatchEvent(new CloseActionScreenEvent());
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: event.detail.id,
                objectApiName: 'Account',
                actionName: 'view'
            }
        });
    }
}