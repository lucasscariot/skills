import React, { Component } from 'react';
import axios from 'axios';
import _ from 'lodash';
import './App.css';

const GITHUB_KEY = '?access_token=027c1d26e0734fe194f9f1c78db04ba4c1b2d020';

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      repos: [],
      skills: [],
      user: {},
    }
  }

  getUser = async (username) => {
    const { data } = await axios(`https://api.github.com/users/${username}/repos${GITHUB_KEY}`);
    this.setState({ repos: data.filter(repo => !repo.fork) })
  }

  getReposLanguages = async (url) => {
    const { data } = await axios(url + GITHUB_KEY);
    return data;
  }

  skillsMap = (skills) => {
    const { size } = skills.reduce((a, b) => ({ size: a.size + b.size }));

    return _.sortBy(skills.map(skill => ({
      ...skill,
      pourcent: _.round((100 * skill.size) / size, 1),
    })), ['size']).reverse();
  }

  getSkills = async () => {
    const { repos } = this.state
    let mappedLanguages = [];

    const reposLanguages = await Promise.all(repos.map(async ({ languages_url, name }) => ({
      languages: await this.getReposLanguages(languages_url),
      data: { repo: name },
    })));

    reposLanguages.forEach(({ languages, data: { repo } }) => {
      const keys = Object.keys(languages);

      if (keys.length === 0) return;

      keys.forEach((name) => {
        const index = mappedLanguages.findIndex(l => l.name === name);
        if (index === -1) {
          mappedLanguages.push({ name, size: languages[name], repos: [repo] });
        } else {
          mappedLanguages[index].repos.push(repo);
          mappedLanguages[index].size += languages[name];
        }
      });
    });


    this.setState({ skills: this.skillsMap(mappedLanguages) })


  }

  async componentDidMount() {
    await this.getUser('lucasscariot')
    await this.getSkills()
  }

  render() {
    const { repos, skills } = this.state

    return (
      <div className="App">
        <h2>Repos</h2>
        <ul>
          {repos.map((repo) => (
            <li key={repo.name}>{repo.name}</li>
          ))}
        </ul>
        <h2>Skills</h2>
        <ul>
          {skills.map((skill) => (
            <li key={skill.name}>{skill.name} | {skill.pourcent}%</li>
          ))}
        </ul>
      </div>
    );
  }
}

export default App;
