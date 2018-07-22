import React from 'react';
import { connect } from 'react-redux';
import { Col, Collapse, Row } from 'antd';
import { DependencyTable } from './DependencyTable';

const Panel = Collapse.Panel;

class TableView extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};

        if (props.reportData) {
            this.state = {
                ...this.state,
                data: props.reportData
            };
        }
    }

    render() {
        const { data } = this.state,
            panelHeader = (project) => {
                let nrPackagesText = (nrPackages) => {
                    return nrPackages + ' package' + ((nrPackages > 1) ? 's' : '');
                };

                return (
                    <Row>
                        <Col span={12}>Dependencies defined in <b> {project.definition_file_path}</b></Col>
                        <Col span={2} offset={10}>{nrPackagesText(project.packages.total)}</Col>
                    </Row>
                );
            };

        return (
            <Collapse defaultActiveKey={Object.keys(data.projects.data).map(project => project)}>
                {Object.entries(data.projects.data).map(([key, project], index) => 
                    <Panel key={key} header={panelHeader(project)}>
                        <DependencyTable project={project}/>
                    </Panel>
                )[6]}
            </Collapse>
        );
    }
}

export default connect(
    (state) => ({reportData: state}),
    () => ({})
)(TableView); 