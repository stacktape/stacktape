export function Divider(props) {
  const { small, medium, large, rootCss } = props;
  const type = small ? 'small' : medium ? 'medium' : large ? 'large' : 'default';
  const size = {
    small: { marginTop: '25px', marginBottom: '15px' },
    medium: { marginTop: '45px', marginBottom: '30px' },
    large: { marginTop: '70px', marginBottom: '45px' },
    default: { marginTop: '53px' }
  }[type];
  return (
    <div
      {...props}
      className="h-px bg-border"
      style={{ ...size, ...rootCss, ...props.style }}
    />
  );
}
