import * as React from 'react'
import * as api from './api'
import * as _ from "lodash"
import { RoomUser } from "../common/common"

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
    users: {}
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
    const page = response1['payload']['page']
    const users = response1['payload']['users']
    this.setState({ page: page, isMaster: isMaster, users: users })
    this.heartbeatHandler = setTimeout(this.heartbeat, this.stepInterval)
  }

  render = () => {
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
        <br></br>
        <button onClick={this.onClickQuit} disabled={!this.state.quitButtonEnabled}>
          나가기
        </button>
      </div>
    )
  }
}
