import { createElement } from '@lwc/engine-dom';
import AccountCreator from 'c/accountCreator';

describe('c-account-creator', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }

        jest.clearAllMocks();
    });

    it('renders fields from fieldList and prepopulates values from JSON', async () => {
        const element = createElement('c-account-creator', {
            is: AccountCreator
        });

        element.objectApiName = 'Account';
        element.fieldList = 'Name, Phone';
        element.formDataJson = '{"Name":"Acme","Phone":"11999999999"}';

        document.body.appendChild(element);
        await Promise.resolve();

        const inputFields = element.shadowRoot.querySelectorAll('lightning-input-field');

        expect(inputFields).toHaveLength(2);
        expect(inputFields[0].fieldName).toBe('Name');
        expect(inputFields[0].value).toBe('Acme');
        expect(inputFields[1].fieldName).toBe('Phone');
        expect(inputFields[1].value).toBe('11999999999');
    });

    it('shows an error message when JSON is invalid', async () => {
        const element = createElement('c-account-creator', {
            is: AccountCreator
        });

        element.fieldList = 'Name';
        element.formDataJson = '{"Name": }';

        document.body.appendChild(element);
        await Promise.resolve();

        expect(element.shadowRoot.textContent).toContain(
            'O JSON informado para preenchimento do formulario e invalido.'
        );
    });
});
