/**
 * Constrói o payload para POST /{WABA_ID}/message_templates conforme documentação Meta.
 * Ref: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/custom-marketing-templates
 * Ref: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components/
 */

export interface TemplateComponentInput {
  type: string;
  format?: string;
  sub_type?: string;
  text?: string;
  url?: string;
  example?: {
    body_text?: string[] | string[][];
    header_text?: string[];
    header_handle?: string[];
    header_image?: string[];
    header_video?: string[];
    header_document?: string[];
    button_url?: string[];
  };
}

export interface CreateTemplateInput {
  name: string;
  language: string;
  category: string;
  components: TemplateComponentInput[];
  parameter_format?: string;
}

// Limites Meta (documentação)
const META = {
  NAME_MAX: 512,
  NAME_REGEX: /^[a-z0-9_]+$/,
  BODY_MIN: 1,
  BODY_MAX: 1024,
  HEADER_TEXT_MAX: 60,
  FOOTER_MAX: 60,
  BUTTON_TEXT_MAX: 25,
  BUTTONS_MAX: 10,
  MIN_CHARS_PER_VARIABLE: 20,
} as const;

function getBodyComponent(components: TemplateComponentInput[]): TemplateComponentInput | undefined {
  return components.find((c) => (c.type || '').toLowerCase() === 'body');
}

function getHeaderComponent(components: TemplateComponentInput[]): TemplateComponentInput | undefined {
  return components.find((c) => (c.type || '').toLowerCase() === 'header');
}

function getFooterComponent(components: TemplateComponentInput[]): TemplateComponentInput | undefined {
  return components.find((c) => (c.type || '').toLowerCase() === 'footer');
}

function getButtonComponents(components: TemplateComponentInput[]): TemplateComponentInput[] {
  return components.filter((c) => (c.type || '').toLowerCase() === 'button');
}

/** Extrai índices de variáveis do body ({{1}}, {{2}}, ...) em ordem. */
function getBodyVariableCount(bodyText: string): number {
  const matches = bodyText.match(/\{\{\s*(\d+)\s*\}\}/g);
  if (!matches || matches.length === 0) return 0;
  const indices = matches.map((m) => parseInt(m.replace(/\D/g, ''), 10));
  return Math.max(...indices);
}

/** Valida e lança com mensagem clara se algo estiver inválido. */
export function validateTemplateCreate(body: CreateTemplateInput): void {
  const comps = body.components || [];
  const name = (body.name || '').trim();
  if (!name) throw new Error('Nome do template é obrigatório.');
  if (name.length > META.NAME_MAX) {
    throw new Error(`Nome deve ter no máximo ${META.NAME_MAX} caracteres.`);
  }
  if (!META.NAME_REGEX.test(name)) {
    throw new Error('Nome deve conter apenas letras minúsculas, números e underscore (ex: meu_template_1).');
  }

  const bodyComp = getBodyComponent(comps);
  if (!bodyComp) throw new Error('O template deve ter um componente de corpo (body).');
  const bodyText = String(bodyComp.text || '').trim();
  if (bodyText.length < META.BODY_MIN) throw new Error('Corpo da mensagem é obrigatório.');
  if (bodyText.length > META.BODY_MAX) {
    throw new Error(`Corpo da mensagem deve ter no máximo ${META.BODY_MAX} caracteres.`);
  }

  const numVars = getBodyVariableCount(bodyText);
  if (numVars > 0) {
    const textWithoutVars = bodyText.replace(/\{\{\s*\d+\s*\}\}/g, '').trim();
    const minChars = numVars * META.MIN_CHARS_PER_VARIABLE;
    if (textWithoutVars.length < minChars) {
      throw new Error(
        `Para ${numVars} variável(is) no corpo, é necessário pelo menos ${minChars} caracteres de texto (excluindo as variáveis). Reduza variáveis ou aumente o texto.`
      );
    }
    const examples = bodyComp.example?.body_text;
    const flatExamples = Array.isArray(examples)
      ? (Array.isArray(examples[0]) ? (examples[0] as string[]) : (examples as string[]))
      : [];
    if (flatExamples.length < numVars) {
      throw new Error(
        `O corpo tem ${numVars} variável(is) ({{1}}, {{2}}...). Informe um texto de amostra para cada uma (ex: João para {{1}}).`
      );
    }
  }

  const headerComp = getHeaderComponent(comps);
  if (headerComp && (headerComp.format || 'text').toString().toLowerCase() === 'text' && headerComp.text) {
    if (headerComp.text.length > META.HEADER_TEXT_MAX) {
      throw new Error(`Cabeçalho (texto) deve ter no máximo ${META.HEADER_TEXT_MAX} caracteres.`);
    }
  }

  const footerComp = getFooterComponent(comps);
  if (footerComp?.text && footerComp.text.length > META.FOOTER_MAX) {
    throw new Error(`Rodapé deve ter no máximo ${META.FOOTER_MAX} caracteres.`);
  }

  const buttons = getButtonComponents(comps);
  if (buttons.length > META.BUTTONS_MAX) {
    throw new Error(`Máximo de ${META.BUTTONS_MAX} botões por template.`);
  }
  for (let i = 0; i < buttons.length; i++) {
    const t = (buttons[i].text || '').trim();
    if (!t) throw new Error(`Texto do botão ${i + 1} é obrigatório.`);
    if (t.length > META.BUTTON_TEXT_MAX) {
      throw new Error(`Texto do botão ${i + 1} deve ter no máximo ${META.BUTTON_TEXT_MAX} caracteres.`);
    }
  }
}

/**
 * Monta o payload exato para POST message_templates.
 * Ordem dos componentes: header, body, footer, buttons (conforme doc Meta).
 */
export function buildMessageTemplatePayload(body: CreateTemplateInput): Record<string, unknown> {
  const comps = body.components || [];
  const category = (body.category || 'utility').toLowerCase();
  const components: Record<string, unknown>[] = [];

  const headerComp = getHeaderComponent(comps);
  if (headerComp) {
    const format = (headerComp.format || 'TEXT').toString().toLowerCase();
    if (format === 'text' && headerComp.text) {
      const text = headerComp.text.trim();
      if (text) {
        components.push({
          type: 'header',
          format: 'text',
          text,
          example: { header_text: [text] },
        });
      }
    } else if (['image', 'video', 'document'].includes(format) && headerComp.example) {
      const meta: Record<string, unknown> = { type: 'header', format };
      if (headerComp.example.header_handle?.length) {
        meta.example = { header_handle: headerComp.example.header_handle };
      } else if (headerComp.example.header_image?.length) {
        meta.example = { header_handle: headerComp.example.header_image };
      } else if (headerComp.example.header_video?.length) {
        meta.example = { header_handle: headerComp.example.header_video };
      } else if (headerComp.example.header_document?.length) {
        meta.example = { header_handle: headerComp.example.header_document };
      }
      if (Object.keys(meta).length > 2) components.push(meta);
    }
  }

  const bodyComp = getBodyComponent(comps);
  if (!bodyComp) throw new Error('Componente body é obrigatório.');
  let bodyText = String(bodyComp.text || '').trim() || ' ';
  const numVars = getBodyVariableCount(bodyText);

  let values: string[] = [];
  if (numVars > 0) {
    const raw = bodyComp.example?.body_text;
    if (Array.isArray(raw) && raw.length > 0) {
      if (Array.isArray(raw[0])) {
        values = (raw[0] as string[]).slice(0, numVars);
      } else {
        values = (raw as string[]).slice(0, numVars);
      }
    }
    while (values.length < numVars) {
      values.push(`Exemplo ${values.length + 1}`);
    }
    values = values.slice(0, numVars);
  }

  // Meta Custom marketing doc usa body_text_named_params; posicionais {{1}},{{2}} são mapeados para var_1, var_2.
  if (numVars > 0) {
    const paramNames = Array.from({ length: numVars }, (_, i) => `var_${i + 1}`);
    for (let i = 0; i < paramNames.length; i++) {
      bodyText = bodyText.replace(new RegExp(`\\{\\{\\s*${i + 1}\\s*\\}\\}`, 'g'), `{{${paramNames[i]}}}`);
    }
    const bodyMeta: Record<string, unknown> = {
      type: 'body',
      text: bodyText,
      example: {
        body_text_named_params: paramNames.map((param_name, idx) => ({
          param_name,
          example: values[idx] || `Exemplo ${idx + 1}`,
        })),
      },
    };
    components.push(bodyMeta);
  } else {
    components.push({ type: 'body', text: bodyText });
  }

  const footerComp = getFooterComponent(comps);
  if (footerComp?.text?.trim()) {
    components.push({ type: 'footer', text: footerComp.text.trim() });
  }

  const buttonComps = getButtonComponents(comps);
  if (buttonComps.length > 0) {
    const buttons: Record<string, unknown>[] = [];
    for (const b of buttonComps) {
      const sub = (b.sub_type || 'quick_reply').toString().toLowerCase().replace(/\s+/g, '_');
      const btnType =
        sub === 'url'
          ? 'url'
          : sub === 'phone_number'
            ? 'phone_number'
            : sub === 'copy_code'
              ? 'copy_code'
              : 'quick_reply';
      const item: Record<string, unknown> = { type: btnType, text: (b.text || '').trim() || 'Botão' };
      if (btnType === 'url' && b.url) item.url = b.url.trim();
      if (btnType === 'phone_number' && b.url) item.phone_number = b.url.trim().replace(/\D/g, '').slice(-20);
      if (btnType === 'url' && b.example?.button_url?.length) item.example = b.example.button_url;
      buttons.push(item);
    }
    components.push({ type: 'buttons', buttons });
  }

  const payload: Record<string, unknown> = {
    name: body.name.trim(),
    language: body.language,
    category,
    components,
    allow_category_change: true,
  };
  // Usamos named (var_1, var_2...) para compatibilidade com o formato do exemplo da Meta.
  payload.parameter_format = 'named';
  return payload;
}
