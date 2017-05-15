import { inject, bindable } from 'aurelia-framework';

import { DataAPI } from '../../gateways/data/data-api';
import { ConnectionAPI } from '../../gateways/connection/connection-api';

import { isEmpty } from '../../lib/string-utils';
import * as MessageTypes from '../../lib/message-types';

@inject(Element, DataAPI, ConnectionAPI)
export class GameContainer {
  @bindable currentNickname = '';
  @bindable word = '';

  constructor(element, dataAPI, connectionAPI) {
    this.element = element;
    this.dataAPI = dataAPI;
    this.connectionAPI = connectionAPI;
  }

  attached() {
    this.audioBank = {
      victoryDing: new Audio('media/audio/victory-ding.ogg'),
      lossDing: new Audio('media/audio/loss-ding.ogg'),
      closeItem: new Audio('media/audio/close-item.ogg'),
      loserPointDing: new Audio('media/audio/loser-point-ding.ogg'),
      winnerPointDing: new Audio('media/audio/winner-point-ding.ogg'),
      wordMismatch: new Audio('media/audio/word-mismatch.ogg'),
      joinGame: new Audio('media/audio/join-game.ogg'),
      opponentFound: new Audio('media/audio/opponent-found.ogg')
    };

    this.initStateModel();
    this.initDOMHooks();
    this.attachDOMListeners();

    this.connectToServer();
  }

  detached() {
    this.detachDOMListeners();
  }

  connectToServer() {
    const serverSocket = this.serverSocket = this.connectionAPI.getGameSocketConnection();
    this.hookUpServerSocket(serverSocket);
  }

  hookUpServerSocket(serverSocket) {
    this.isConnectingToServer = true;
    this.loadingText = 'Connecting to server...';
    serverSocket.onopen = (event) => {
      this.isConnectingToServer = false;
    };

    serverSocket.onclose = (event) => {
      // TODO
    };

    serverSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
      switch (data.type) {
      case MessageTypes.CONNECT_RESPONSE:
        this.handleConnectResponse(data);
        break;
      case MessageTypes.SET_NICKNAME_RESPONSE:
        this.handleSetNicknameResponse(data);
        break;
      case MessageTypes.BROADCAST_WORD:
        this.handleBroadcastWord(data);
        break;
      case MessageTypes.TYPE_WORD_RESPONSE:
        this.handleTypeWordResponse(data);
        break;
      case MessageTypes.TERMINATE_GAME:
        this.handleTerminateGame(data);
        break;
      default:
        break;
      }
    };
  }

  /* SERVER MESSAGE HANDLERS */
  handleConnectResponse(data) {
    this.sessionId = data.sessionId;
  }

  handleSetNicknameResponse(data) {
    this.isSettingNickname = false;
    this.isNicknameSet = true;

    this.canDisplayTutorial = true;
    this.canJoinGame = true;
    this.isInGame = false;
  }

  handleBroadcastWord(data) {
    playAudio(this.audioBank.opponentFound);

    this.isWaitingForOpponent = false;
    this.currentWord = data.word;
    this.currentOpponent = data.opponentNickname;
    this.isInGame = true;
    this.hasNotSentWord = true;
  }

  handleTypeWordResponse(data) {
    // TODO
    switch (data.gameMessageType) {
    case MessageTypes.WORD_MISMATCH:
      this.handleWordMismatch();
      break;
    case MessageTypes.ROUND_WON:
      this.handleRoundWon(data);
      break;
    case MessageTypes.ROUND_LOST:
      this.handleRoundLost(data);
      break;
    default:
      break;
    }
  }

  handleWordMismatch() {
    playAudio(this.audioBank.wordMismatch);
  }

  handleRoundWon(data) {
    playAudio(this.audioBank.victoryDing);
  }

  handleRoundLost(data) {
    playAudio(this.audioBank.lossDing);
  }
  /* /SERVER MESSAGE HANDLERS */

  /* USER INTERACTION HANDLERS */
  handleTerminateGame(data) {
    // TODO
  }

  handleSetNicknameClick() {
    playAudio(this.audioBank.closeItem);
    this.setNickname();
  }

  handleJoinGameClick() {
    playAudio(this.audioBank.joinGame);
    this.joinGame();
  }

  handleWordSubmit() {
    if (this.canSubmitWord) {
      this.sendWord();
    }
  }
  /* /USER INTERACTION HANDLERS */

  /* APP LOGIC */
  setNickname() {
    this.loadingText = 'Setting nickname...';
    this.isSettingNickname = true;
    const nickname = this.currentNickname;
    const message = constructMessage(MessageTypes.SET_NICKNAME, { nickname });
    this.sendToServer(message);
  }

  joinGame() {
    this.loadingText = 'Waiting for an opponent...';
    this.isWaitingForOpponent = true;
    this.canDisplayTutorial = false;
    this.canJoinGame = false;
    const message = constructMessage(MessageTypes.JOIN_GAME);
    this.sendToServer(message);
  }

  sendWord() {
    const message = constructMessage(MessageTypes.TYPE_WORD, { word: this.word });
    this.sendToServer(message);
  }
  /* /APP LOGIC */

  /* INITIALIZERS */
  initStateModel() {
    this.isConnectingToServer = false;
    this.isSettingNickname = false;

    this.canJoinGame = false;
    this.canDisplayTutorial = false;

    this.sessionId = null;
    this.isNicknameSet = false;
    this.loadingText = null;
  }

  initDOMHooks() {

  }

  attachDOMListeners() {

  }

  detachDOMListeners() {

  }
  /* /INITIALIZERS */

  /* VISIBLITY LOGIC */
  get showLoadingBanner() {
    return this.isConnectingToServer || !this.sessionId || this.isSettingNickname || this.isWaitingForOpponent;
  }

  get showNicknameForm() {
    return !this.isConnectingToServer && !this.isNicknameSet;
  }

  get canSetNickname() {
    return !isEmpty(this.currentNickname);
  }

  get showTutorial() {
    return this.canDisplayTutorial;
  }

  get showJoinGameForm() {
    return this.canJoinGame;
  }

  get showGameArea() {
    return this.isInGame;
  }
  /* /VISIBLITY LOGIC */

  /* GATEWAY LOGIC */
  get canSubmitWord() {
    return !isEmpty(this.word);
  }
  /* /GATEWAY LOGIC /

  /* SHARED UTILS */
  sendToServer(message) {
    sendMessage(this.serverSocket, message);
  }
  /* /SHARED UTILS */
}

const playAudio = (audioNode) => {
  audioNode.cloneNode().play();
};

const sendMessage = (socket, message) => {
  socket.send(JSON.stringify(message));
};

const constructMessage = (type, content = {}) => {
  return {
    type,
    ...content
  };
};
