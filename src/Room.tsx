import * as React from 'react'
import * as api from './api'
import * as _ from "lodash"
import { RoomUser, GameConfig, KeywordElem } from "../common/common"
import { Content } from "./Content"
import { ActiveUsers } from "./ActiveUsers"

export class Room extends React.Component {
  props: {
    userId: string,
    roomKey: string,
    onQuit: () => void,
    onError: () => void
  }

  state = {
    quitButtonEnabled: true,
    isMaster: false,
    page: "idle",
    users: {} as Record<string, RoomUser>,
    content: {} as KeywordElem,
    targetConfig: { numSpies: 1, mix: false, numFalses: 4 } as GameConfig
  }

  stepInterval = 500
  heartbeatHandler: NodeJS.Timeout = null

  onClickQuit = async () => {
    this.setState({ quitButtonEnabled: false })
    const response1 = await api.postRequest("quit-room", { userId: this.props.userId, roomKey: this.props.roomKey })
    if (!response1['success']) {
      this.props.onError()
      return
    }

    clearTimeout(this.heartbeatHandler)
    this.props.onQuit()
  }

  onClickStart = async () => {
    this.setState({ page: "starting" })
    
    const response1 = await api.postRequest("start-round", {
      userId: this.props.userId,
      roomKey: this.props.roomKey,
      config: this.state.targetConfig
    })
    if (!response1['success']) {
      this.props.onError()
      return
    }

    this.setState({ page: "round" })
  }

  onClickStop = async () => {
    this.setState({ page: "stopping" })
    
    const response1 = await api.postRequest("stop-round", {
      userId: this.props.userId,
      roomKey: this.props.roomKey
    })
    if (!response1['success']) {
      this.props.onError()
      return
    }

    this.setState({ page: "idle" })
  }

  onClickMix = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const value = !this.state.targetConfig.mix
    this.setState({ targetConfig: { ...this.state.targetConfig, mix: value } })
  }

  onChangeNumSpies = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number.parseInt(e.target.value)
    this.setState({ targetConfig: { ...this.state.targetConfig, numSpies: value } })
  }

  onChangeNumFalses = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number.parseInt(e.target.value)
    this.setState({ targetConfig: { ...this.state.targetConfig, numFalses: value } })
  }

  constructor(props) {
    super(props)
    this.heartbeat()
  }

  heartbeat = async () => {
    const response1 = await api.postRequest("heartbeat", { userId: this.props.userId, roomKey: this.props.roomKey })
    if (!response1['success']) {
      this.props.onError()
      return
    }

    const isMaster = response1['payload']['isMaster']
    const users = response1['payload']['users']
    const content = response1['payload']['content']
    this.setState({ isMaster: isMaster, users: users, content: content })
    this.heartbeatHandler = setTimeout(this.heartbeat, this.stepInterval)
  }

  render = () => {
    const numUsers = _.keys(this.state.users).length
    return (
      <div className="row">
        <div className="col-12 text-center">
          <h1><span className="badge badge-info">{this.props.roomKey}</span></h1>
        </div>
        <div className="col-12 text-center">
          <Content content={this.state.content}/>
        </div>
        <div className="col-12 mt-3 text-center">
          <ActiveUsers users={this.state.users}/>
        </div>
        {
          this.state.isMaster ? (
            <div className="col-12 text-center mt-3">
              <div className="row">
                <div className="col-12 text-center">
                  <div className="btn-group" role="group" aria-label="Basic example">
                    <button
                      className="btn btn-primary"
                      onClick={this.onClickStart}
                      disabled={this.state.page !== "idle" || numUsers < 2}
                    >
                      라운드 시작
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={this.onClickStop}
                      disabled={this.state.page !== "round"}
                    >
                      라운드 종료
                    </button>
                  </div>
                </div>
                <div className="col-6 text-center mt-3">
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <label className="input-group-text">스파이 수</label>
                    </div>
                    <select className="custom-select" onChange={this.onChangeNumSpies}>
                      {
                        [1, 2, 3, 4, 5].filter(num => num < numUsers).map(num => {
                          return <option value={num}>{num}</option>
                        })
                      }
                    </select>
                  </div>
                </div>
                <div className="col-6 text-center mt-3">
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <label className="input-group-text">함정 수</label>
                    </div>
                    <select className="custom-select" onChange={this.onChangeNumFalses}>
                      {
                        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                          return <option value={num}>{num}</option>
                        })
                      }
                    </select>
                  </div>
                </div>
                <div className="col-12 text-center mt-3">
                  <button className={`btn ${this.state.targetConfig.mix ? "btn-success" : "btn-secondary"}`} onClick={this.onClickMix}>
                    주제 섞기
                  </button>
                </div>
              </div>
            </div>
          ) : ( <div></div> )
        }
        <div className="col-12 text-center mt-5 mb-5">
          <button
            className="btn btn-warning"
            onClick={this.onClickQuit}
            disabled={!this.state.quitButtonEnabled}
          >
            나가기
          </button>
        </div>
      </div>
    )
  }
}
