import React, { Component } from 'react'
import axios from 'axios'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
import {
  Row,
  Col,
  List,
  Tabs,
  Layout,
  Form,
  Input,
  Button,
  Badge,
  Tooltip,
} from 'antd'
import _ from 'lodash'

import 'antd/dist/antd.css'

import './App.css'

const { Header } = Layout
const { TabPane } = Tabs

const GITHUB_KEY = process.env.REACT_APP_GITHUB_KEY ? `?access_token=${process.env.REACT_APP_GITHUB_KEY}` : ''

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      username: 'lucasscariot',
      repos: [],
      skills: [],
      activity: [],
      currentTab: '1',
      user: {},
    }
  }

  async componentDidMount() {
    await this.fetchData()
  }

  onChange = e => this.setState({ username: e.target.value })

  getUser = async () => {
    const { username } = this.state
    const { data } = await axios(`https://api.github.com/users/${username}${GITHUB_KEY}`)
    this.setState({ user: data })
  }

  getRepos = async () => {
    const { username } = this.state
    const { data } = await axios(`https://api.github.com/users/${username}/repos${GITHUB_KEY}`)
    this.setState({ repos: data.filter(repo => !repo.fork) })
  }

  getReposLanguages = async (url) => {
    const { data } = await axios(url + GITHUB_KEY)
    return data
  }

  getActivity = async () => {
    const { username } = this.state
    const { data } = await axios(`https://api.github.com/users/${username}/events${GITHUB_KEY}`)
    this.setState({ activity: data })
  }


  getSkills = async () => {
    const { repos } = this.state
    const mappedLanguages = []

    const reposLanguages = await Promise.all(repos.map(async ({
      languages_url, // eslint-disable-line
      name,
    }) => ({
      languages: await this.getReposLanguages(languages_url),
      data: { repo: name },
    })))

    reposLanguages.forEach(({ languages, data: { repo } }) => {
      const keys = Object.keys(languages)

      if (keys.length === 0) return

      keys.forEach((name) => {
        const index = mappedLanguages.findIndex(l => l.name === name)
        if (index === -1) {
          mappedLanguages.push({ name, size: languages[name], repos: [repo] })
        } else {
          mappedLanguages[index].repos.push(repo)
          mappedLanguages[index].size += languages[name]
        }
      })
    })

    if (mappedLanguages.length === 0) return

    this.setState({ skills: this.skillsMap(mappedLanguages).filter(l => l.pourcent > 1) })
  }

  skillsMap = (skills) => {
    const { size } = skills.reduce((a, b) => ({ size: a.size + b.size }))

    return _.sortBy(skills.map(skill => ({
      ...skill,
      pourcent: _.round((100 * skill.size) / size, 1),
    })), ['size']).reverse()
  }

  fetchData = async () => {
    await this.getUser()
    await this.getRepos()
    await this.getSkills()
  }

  renderEvent = (event) => {
    const { type } = event

    switch (type) {
      case 'PushEvent':
        return `Push [${event.repo.name}] - ${event.payload.commits[0].message.slice(0, 50)}`
      case 'IssueCommentEvent':
        return `Commented an issue on ${event.repo.name}`
      case 'CreateEvent':
        return `Created a ${event.payload.ref_type} (${event.repo.name})`
      case 'WatchEvent':
        return `${event.payload.action} - ${event.repo.name}`
      default:
        return type
    }
  }

  onChangeTab = async (index) => {
    const { repos, activity } = this.state

    this.setState({ currentTab: index })
    if (index === '1' && repos.length === 0) {
      await this.getRepos()
    } else if (index === '2' && activity.length === 0) {
      await this.getActivity()
    }
  }

  render() {
    const {
      repos, skills, activity, username, currentTab, user,
    } = this.state

    return (
      <Layout>
        <Header style={{ color: 'white' }}>
          <Tooltip placement="bottom" title={user.hireable ? 'Open to job offers' : 'Not open to job offers'}>
            {user.name} {user.location ? `| ${user.location}` : ''}
            <Badge style={{ marginLeft: 10 }} status={user.hireable ? 'success' : 'error'} />
          </Tooltip>
          <i style={{ marginLeft: 10 }}>{user.bio}</i>
          <b style={{ marginLeft: 20 }}>{user.email ? `- ${user.email}` : ''}</b>
        </Header>
        <Row gutter={48} style={{ background: '#fff' }}>
          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
              <div>
                <Form layout="inline" style={{ display: 'flex', justifyContent: 'center' }} >
                  <Form.Item>
                    <Input placeholder="Username" value={username} onChange={this.onChange} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" onClick={this.fetchData}>Search</Button>
                  </Form.Item>
                </Form>
                <RadarChart
                  cx={300}
                  cy={250}
                  outerRadius={150}
                  width={600}
                  height={500}
                  data={skills}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <Radar name="name" dataKey="size" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </RadarChart>
              </div>
            </div>
          </Col>
          <Col span={12}>
            <Tabs
              defaultActiveKey={currentTab}
              onChange={this.onChangeTab}
            >
              <TabPane tab={`Repositories (${repos.length})`} key="1">
                <div style={{ margin: 20 }}>
                  <List
                    itemLayout="horizontal"
                    bordered
                    dataSource={repos}
                    renderItem={repo => (
                      <List.Item><b>{repo.name}</b> {repo.description ? <i>&nbsp;|&nbsp;{repo.description}</i> : ''}</List.Item>
                    )}
                  />
                </div>
              </TabPane>
              <TabPane tab="Activity" key="2">
                <div style={{ margin: 20 }}>
                  <List
                    itemLayout="horizontal"
                    bordered
                    dataSource={activity.map(this.renderEvent)}
                    renderItem={item => (
                      <List.Item>{item}</List.Item>
                    )}
                  />
                </div>
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </Layout>
    )
  }
}

export default App
