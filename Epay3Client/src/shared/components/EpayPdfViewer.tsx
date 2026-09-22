import { Box } from '@mui/system';
import { Modal } from '@mui/material';
import EpayBox from 'shared/components/EpayBox';
import CloseIcon from '@mui/icons-material/Close';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80vw',
  maxWidth: '900px',
  height: '80vh',
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  borderRadius: '12px',
  boxShadow: 24,
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const iframeStyle = {
  flexGrow: 1,
  width: '100%',
  height: '100%',
  border: 'none',
};

interface EpayPdfViewerProps {
  open: boolean;
  pdfUrl: string | null;
  onClose: () => void;
}

const EpayPdfViewer = ({ open, pdfUrl, onClose }: EpayPdfViewerProps) => {
  return (
    <Modal open={open} onClose={onClose}>
      <>
        <Box
          sx={{
            position: 'fixed',
            right: 10,
            top: 10,
            cursor: 'pointer',
            color: '#FFF',
          }}
        >
          <CloseIcon fontSize="large" onClick={onClose} />
        </Box>
        <EpayBox sx={modalStyle}>
          <Box sx={{ flex: 1, display: 'flex' }}>
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                style={iframeStyle}
                title="PDF Viewer"
              ></iframe>
            ) : (
              <p>Loading PDF...</p>
            )}
          </Box>
        </EpayBox>
      </>
    </Modal>
  );
};

export default EpayPdfViewer;
