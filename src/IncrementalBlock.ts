import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import Beta from "./beta";

class IncrementalBlock {
  // readonly block: BlockEntity | null;
  readonly properties: Record<string, any>;
  readonly beta: Beta | null;
  readonly dueDate: Date | null;
  readonly sample: number | null;

  constructor(props: Record<string, any>) {
    this.properties = props;
    this.beta = Beta.fromProps(props);

    const sample = parseFloat(props['ibSample']);
    if (Beta.isValidSample(sample)) {
      this.sample = sample;
    } else {
      this.sample = null;
    }
    
    const due = new Date(props['ibDue']);
    if (due instanceof Date && !isNaN(due.getTime())) {
      this.dueDate = due;
    } else {
      this.dueDate = null;
    }
  }
}

export default IncrementalBlock;