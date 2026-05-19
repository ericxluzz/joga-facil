export class AgendaSlimError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'AgendaSlimError';
  }
}

export class SlotUnavailableError extends AgendaSlimError {
  constructor(message = 'Esse horário já não está mais disponível.') {
    super(message, 'SLOT_UNAVAILABLE', 409);
  }
}

export class InvalidAdvanceError extends AgendaSlimError {
  constructor(message = 'Antecedência fora da política do estabelecimento.') {
    super(message, 'INVALID_ADVANCE', 400);
  }
}

export class BookingNotFoundError extends AgendaSlimError {
  constructor() {
    super('Reserva não encontrada.', 'BOOKING_NOT_FOUND', 404);
  }
}

export class HoldExpiredError extends AgendaSlimError {
  constructor() {
    super('O tempo do carrinho expirou. Selecione novamente.', 'HOLD_EXPIRED', 410);
  }
}
