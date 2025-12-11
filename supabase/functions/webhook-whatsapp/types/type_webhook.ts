
export interface WhatsAppMessage {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body: string };
    image?: any;
    audio?: any;
    video?: any;
    document?: any;
    location?: any;
}

export interface WhatsAppChangeValue {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: any[];
    messages?: WhatsAppMessage[];
    statuses?: any[];
}

export interface WhatsAppChange {
    value: WhatsAppChangeValue;
    field: string;
}

export interface WhatsAppEntry {
    id: string;
    changes: WhatsAppChange[];
}

export interface WhatsAppWebhookBody {
    object: string;
    entry: WhatsAppEntry[];
}

export interface WhatsAppWebhookWrapper {
    headers: any;
    body: WhatsAppWebhookBody;
}

export type WhatsAppPayload = WhatsAppWebhookBody | WhatsAppWebhookWrapper[];
