import React from 'react';

type Props = {
	message: string;
	callToActionLabel: string;
	callToActionUrl: string;
};

export const Promo = ({ message, callToActionLabel, callToActionUrl }: Props) => {
	return (
		<div className="promo">
			<i className="fa-regular fa-sparkles icon" />
			<div>
				<span>{message}</span>
				<div className="actions">
					<a className="btn" href={callToActionUrl} target="_blank">
						{callToActionLabel}
					</a>
				</div>
			</div>
		</div>
	);
};
