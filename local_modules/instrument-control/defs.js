// @ts-check

export const MIDI_MSG_TYPE = {
    NOTE_OFF: 0x80,
    NOTE_ON: 0x90,
    KEY_PRESSURE: 0xA0,
    CONTROL_CHANGE: 0xB0,
    PROGRAM_CHANGE: 0xC0,
    CHANNEL_PRESSURE: 0xD0,
    PITCH_BEND_CHANGE: 0xE0
};

export const MIDI_MSG_TYPE_NAME = {
    0x80: 'NOTE_OFF',
    0x90: 'NOTE_ON',
    0xA0: 'KEY_PRESSURE',
    0xB0: 'CONTROL_CHANGE',
    0xC0: 'PROGRAM_CHANGE',
    0xD0: 'CHANNEL_PRESSURE',
    0xE0: 'PITCH_BEND_CHANGE'
};
