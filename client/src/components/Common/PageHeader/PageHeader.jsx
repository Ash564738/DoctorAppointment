import React from 'react';
import './PageHeader.css';

const PageHeader = ({ title, subtitle, actions, className = '' }) => {
	return (
		<div className={`pageHeader_container ${className}`.trim()}>
			<div className="pageHeader_content">
				<div className="pageHeader_text">
					{title ? <h1 className="pageHeader_title">{title}</h1> : null}
					{subtitle ? <p className="pageHeader_subtitle">{subtitle}</p> : null}
				</div>
				{actions ? (
					<div className="pageHeader_actions" aria-label="page actions">
						{actions}
					</div>
				) : null}
			</div>
		</div>
	);
};

export default PageHeader;

