import * as React from 'react'
import * as api from './api'
import * as _ from "lodash"
import { RoomUser, GameConfig } from "../common/common"

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
    users: {},
    content: {},
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

  onChangeMix = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked
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
      <div>
        Hello
        <br></br>
        {this.props.userId}
        <br></br>
        {this.props.roomKey}
        <br></br>
        {this.state.isMaster ? "방장입니다" : "게스트입니다"}
        <br></br>
        <div>
          {
            _.toPairs(this.state.users).map(([userId, userRaw]) => {
              const user = userRaw as RoomUser
              return (
                <span key={userId}>
                  {user.name}: {user.status}
                </span>
              )
            })
          }
        </div>
        {
          this.state.isMaster ? (
            <div>
              <button
                onClick={this.onClickStart}
                disabled={this.state.page !== "idle" || numUsers < 2}
              >
                라운드 시작
              </button>
              <button
                onClick={this.onClickStop}
                disabled={this.state.page !== "round"}
              >
                라운드 종료
              </button>
              스파이 수
              <select onChange={this.onChangeNumSpies}>
                {
                  [1, 2, 3, 4, 5].filter(num => num < numUsers).map(num => {
                    return <option value={num}>{num}</option>
                  })
                }
              </select>
              함정 수
              <select onChange={this.onChangeNumFalses}>
                {
                  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                    return <option value={num}>{num}</option>
                  })
                }
              </select>
              <input type="checkbox" name="mix" value="mix" onChange={this.onChangeMix}/>
              주제 섞기
            </div>
          ) : (
            <div>
              방장이 아닙니다
            </div>
          )
        }
        <div>
          {JSON.stringify(this.state.content)}
        </div>
        <button onClick={this.onClickQuit} disabled={!this.state.quitButtonEnabled}>
          나가기
        </button>
      </div>
    )
  }
}
